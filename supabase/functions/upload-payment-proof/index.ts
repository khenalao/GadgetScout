import { createClient } from "npm:@supabase/supabase-js@2";
import { importX509, jwtVerify } from "npm:jose@5.9.6";

const FIREBASE_PROJECT_ID = "gadgetscout-62bde";
const FIREBASE_ISSUER =
  `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const BUCKET_NAME = "payment-proofs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

let cachedCertificates: Record<string, string> | null = null;
let certificatesExpireAt = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function response(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function getFirebaseCertificate(kid: string) {
  if (!cachedCertificates || Date.now() >= certificatesExpireAt) {
    const result = await fetch(FIREBASE_CERT_URL);

    if (!result.ok) {
      throw new HttpError("Firebase verification unavailable.", 503);
    }

    cachedCertificates = await result.json();

    const cacheControl = result.headers.get("Cache-Control") ?? "";
    const maxAge = Number(
      cacheControl.match(/max-age=(\d+)/)?.[1] ?? "3600",
    );

    certificatesExpireAt = Date.now() + maxAge * 1000;
  }

  const certificate = cachedCertificates?.[kid];

  if (!certificate) {
    throw new HttpError("Invalid Firebase signing key.", 401);
  }

  return certificate;
}

async function verifyFirebaseToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new HttpError("Invalid token.", 401);
  }

  const base64Header = parts[0]
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const decodedHeader = atob(
    base64Header.padEnd(
      Math.ceil(base64Header.length / 4) * 4,
      "=",
    ),
  );

  const header = JSON.parse(decodedHeader);

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new HttpError("Invalid token header.", 401);
  }

  const certificate = await getFirebaseCertificate(header.kid);
  const publicKey = await importX509(certificate, "RS256");

  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: FIREBASE_ISSUER,
    audience: FIREBASE_PROJECT_ID,
    clockTolerance: 5,
  });

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    typeof payload.auth_time !== "number" ||
    payload.auth_time > Math.floor(Date.now() / 1000)
  ) {
    throw new HttpError("Invalid Firebase user claims.", 401);
  }

  return payload.sub;
}

// Read a Firestore document using the authenticated user's token.
// Firestore Security Rules still apply to this request.
async function getFirestoreDocument(
  collection: string,
  uid: string,
  token: string,
) {
  const url =
    `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(uid)}`;

  const result = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result.status === 404) {
    return null;
  }

  if (result.status === 401 || result.status === 403) {
    throw new HttpError("Firestore access denied.", 403);
  }

  if (!result.ok) {
    throw new HttpError("Unable to verify shop account.", 503);
  }

  return await result.json();
}

// Verify that the authenticated user owns an approved shop.
async function verifyShopOwner(uid: string, token: string) {
  const userDocument = await getFirestoreDocument(
    "users",
    uid,
    token,
  );

  if (!userDocument) {
    throw new HttpError("User account not found.", 403);
  }

  const role = userDocument.fields?.role?.stringValue;

  if (role !== "shopOwner") {
    throw new HttpError("Only shop owners can upload proof.", 403);
  }

  const shopDocument = await getFirestoreDocument(
    "shops",
    uid,
    token,
  );

  if (!shopDocument) {
    throw new HttpError("Shop profile not found.", 403);
  }

  const fields = shopDocument.fields ?? {};

  if (
    fields.ownerUid?.stringValue !== uid ||
    fields.profileStatus?.stringValue !== "approved"
  ) {
    throw new HttpError("Shop is not approved.", 403);
  }
}

// Verify actual image signatures, not only the supplied MIME type.
async function verifyImageFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (file.type === "image/png") {
    const signature = [
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ];

    return signature.every((value, index) =>
      bytes[index] === value
    );
  }

  if (file.type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed." }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      throw new HttpError("Authentication required.", 401);
    }

    const token = authorization.slice(7);
    const uid = await verifyFirebaseToken(token);

    // IMPORTANT: Verify ownership and approval before uploading.
    await verifyShopOwner(uid, token);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new HttpError("Payment proof file is required.", 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      throw new HttpError(
        "File must be between 1 byte and 5 MB.",
        400,
      );
    }

    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = allowedTypes[file.type];

    if (!extension) {
      throw new HttpError(
        "Only JPG, PNG, and WEBP images are accepted.",
        400,
      );
    }

    if (!(await verifyImageFile(file))) {
      throw new HttpError("Invalid image file.", 400);
    }

    const secretKeysValue = Deno.env.get("SUPABASE_SECRET_KEYS");

    const secretKey = secretKeysValue
      ? JSON.parse(secretKeysValue)["default"]
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!secretKey || !supabaseUrl) {
      throw new HttpError(
        "Storage configuration is missing.",
        500,
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const filePath =
      `${uid}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Storage upload failed:", error.message);

      throw new HttpError(
        "Payment proof upload failed.",
        500,
      );
    }

    return response({
      success: true,
      path: filePath,
      message: "Payment proof uploaded successfully.",
    });
  } catch (error) {
    console.error("Upload function error:", error);

    if (error instanceof HttpError) {
      return response({ error: error.message }, error.status);
    }

    return response({
      error: "An unexpected upload error occurred.",
    }, 500);
  }
});