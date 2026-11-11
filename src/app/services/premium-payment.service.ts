
import { Injectable } from '@angular/core';

import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { environment } from '../../environments/environment';

export interface PaymentUploadResult {
  success: boolean;
  path: string;
  message: string;
}

export interface PaymentSubmissionResult {
  success: boolean;
  subscriptionId: string;
  paymentProofPath: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PremiumPaymentService {

  private readonly functionUrl =
    `${environment.supabaseUrl}/functions/v1/upload-payment-proof`;

  // Upload screenshot to private Supabase Storage.
  async uploadPaymentProof(file: File): Promise<PaymentUploadResult> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please log in before uploading payment proof.');
    }

    if (!environment.supabaseAnonKey) {
      throw new Error('Supabase public key is not configured.');
    }

    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      throw new Error('Payment proof must not exceed 5 MB.');
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPG, PNG, and WEBP images are accepted.');
    }

    const idToken = await user.getIdToken();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(this.functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        apikey: environment.supabaseAnonKey
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || 'Unable to upload payment proof.'
      );
    }

    if (!result?.success || !result?.path) {
      throw new Error('Invalid response from payment upload service.');
    }

    return {
      success: true,
      path: result.path,
      message: result.message || 'Payment proof uploaded successfully.'
    };
  }

  // Upload proof and create a pending Firestore payment record.
  async submitPayment(file: File): Promise<PaymentSubmissionResult> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please log in before submitting payment.');
    }

    // Prevent another submission while a payment is pending.
    const pendingQuery = query(
      collection(db, 'subscriptions'),
      where('ownerUid', '==', user.uid),
      where('status', '==', 'pending')
    );

    const pendingSnapshot = await getDocs(pendingQuery);

    if (!pendingSnapshot.empty) {
      throw new Error(
        'You already have a pending payment submission. Please wait for Admin verification.'
      );
    }

    // Upload screenshot first.
    const uploadResult = await this.uploadPaymentProof(file);

    // Save payment information in Firestore.
    const paymentDocument = await addDoc(
      collection(db, 'subscriptions'),
      {
        ownerUid: user.uid,
        shopUid: user.uid,
        plan: 'monthly',
        amount: 199,
        currency: 'PHP',
        paymentMethod: 'GCash',
        paymentProofPath: uploadResult.path,
        status: 'pending',
        submittedAt: serverTimestamp()
      }
    );

    return {
      success: true,
      subscriptionId: paymentDocument.id,
      paymentProofPath: uploadResult.path,
      message: 'Payment submitted successfully. Waiting for Admin verification.'
    };
  }
}
