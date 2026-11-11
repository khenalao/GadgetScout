import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge
} from '@ionic/angular';

import {
  collection,
  onSnapshot,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';

import { Router } from '@angular/router';
import { db } from '../../firebase';
import * as L from 'leaflet';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  storefrontOutline,
  shieldCheckmarkOutline,
  locationOutline,
  callOutline,
  informationCircleOutline
} from 'ionicons/icons';

interface ShopLocation {
  latitude: number;
  longitude: number;
}

interface ApprovedShop {
  uid: string;
  ownerUid: string;
  shopName: string;
  ownerName: string;
  email: string;
  contactNumber: string;
  address: string;
  category: string;
  description: string;
  services: string[];
  profileStatus: string;
  publicationStatus: string;
  subscriptionStatus: string;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
  location?: ShopLocation;
}

@Component({
  selector: 'app-shops',
  templateUrl: './shops.page.html',
  styleUrls: ['./shops.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge
  ]
})
export class ShopsPage implements OnInit, OnDestroy {

  searchText = '';

  shops: ApprovedShop[] = [];

  isLoading = true;
  errorMessage = '';

  private unsubscribeShops?: Unsubscribe;
  private loadingTimeout?: ReturnType<typeof setTimeout>;

  private map?: L.Map;
  private markerLayer?: L.LayerGroup;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      storefrontOutline,
      shieldCheckmarkOutline,
      locationOutline,
      callOutline,
      informationCircleOutline
    });
  }

  ngOnInit(): void {
    this.loadApprovedShops();
  }

  // BACK TO CUSTOMER DASHBOARD

  goToDashboard(): void {
    this.router.navigateByUrl('/home');
  }

  // CONVERT FIRESTORE DATE TO JAVASCRIPT DATE

  private convertToDate(value: any): Date | null {

    if (!value) return null;

    let result: Date | null = null;

    if (typeof value.toDate === 'function') {
      result = value.toDate();
    } else if (value instanceof Date) {
      result = value;
    } else if (
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      result = new Date(value);
    }

    if (!result || !Number.isFinite(result.getTime())) {
      return null;
    }

    return result;
  }

  // CHECK ACTIVE PREMIUM SUBSCRIPTION

  private hasValidSubscription(data: any): boolean {

    if (data['subscriptionStatus'] !== 'active') {
      return false;
    }

    const startDate = this.convertToDate(
      data['subscriptionStartDate']
    );

    const endDate = this.convertToDate(
      data['subscriptionEndDate']
    );

    if (!startDate || !endDate) {
      return false;
    }

    const now = Date.now();

    return (
      now >= startDate.getTime() &&
      now <= endDate.getTime()
    );
  }

  // NORMALIZE SHOP LOCATION

  private normalizeLocation(data: any): ShopLocation | undefined {

    const rawLocation = data['location'];

    const rawLatitude =
      rawLocation?.lat ??
      rawLocation?.latitude ??
      data['latitude'];

    const rawLongitude =
      rawLocation?.lng ??
      rawLocation?.longitude ??
      data['longitude'];

    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);

    if (
      rawLatitude === null ||
      rawLatitude === undefined ||
      rawLongitude === null ||
      rawLongitude === undefined ||
      rawLatitude === '' ||
      rawLongitude === ''
    ) {
      return undefined;
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return undefined;
    }

    return {
      latitude,
      longitude
    };
  }

  // LOAD APPROVED SHOPS WITH ACTIVE PREMIUM SUBSCRIPTION

  loadApprovedShops(): void {

    this.isLoading = true;
    this.errorMessage = '';
    this.shops = [];

    this.clearLoadingTimeout();

    this.unsubscribeShops?.();

    this.cdr.detectChanges();

    console.log(
      'Loading approved shops with active Premium subscriptions...'
    );

    const shopsQuery = query(
      collection(db, 'shops'),
      where('profileStatus', '==', 'approved'),
      where('subscriptionStatus', '==', 'active')
    );

    this.loadingTimeout = setTimeout(() => {

      if (this.isLoading) {

        console.error(
          'Firestore did not return a response within 12 seconds.'
        );

        this.isLoading = false;

        this.errorMessage =
          'Unable to connect to the repair shop directory. Please check your internet connection and Firestore configuration.';

        this.cdr.detectChanges();
      }

    }, 12000);

    this.unsubscribeShops = onSnapshot(
      shopsQuery,

      (snapshot) => {

        console.log(
          'Approved shops with active subscriptions received:',
          snapshot.size
        );

        this.clearLoadingTimeout();

        const eligibleShops: ApprovedShop[] = [];

        snapshot.docs.forEach((document) => {

          const data = document.data();

          if (!this.hasValidSubscription(data)) {

            console.log(
              'Shop excluded because its subscription is invalid or expired:',
              data['shopName']
            );

            return;
          }

          const rawServices = data['services'];

          const services: string[] = Array.isArray(rawServices)
            ? rawServices.filter(
                (service: unknown): service is string =>
                  typeof service === 'string'
              )
            : typeof rawServices === 'string' &&
              rawServices.trim() !== '' &&
              rawServices !== 'All'
              ? [rawServices]
              : [];

          const location = this.normalizeLocation(data);

          const shop: ApprovedShop = {

            uid: document.id,

            ownerUid:
              data['ownerUid'] ?? document.id,

            shopName:
              data['shopName'] ?? 'Unnamed Repair Shop',

            ownerName:
              data['ownerName'] ?? '',

            email:
              data['email'] ?? '',

            contactNumber:
              data['contactNumber'] ??
              data['phone'] ??
              '',

            address:
              data['address'] ?? 'Address not available',

            category:
              data['category'] ?? '',

            description:
              data['description'] ?? '',

            services,

            profileStatus:
              data['profileStatus'] ?? '',

            publicationStatus:
              data['publicationStatus'] ?? '',

            subscriptionStatus:
              data['subscriptionStatus'] ?? '',

            subscriptionStartDate:
              data['subscriptionStartDate'] ?? null,

            subscriptionEndDate:
              data['subscriptionEndDate'] ?? null,

            location

          };

          eligibleShops.push(shop);

          console.log(
            'Shop location:',
            shop.shopName,
            location ?? 'NO VALID LOCATION'
          );

        });

        this.shops = eligibleShops;

        this.isLoading = false;
        this.errorMessage = '';

        this.cdr.detectChanges();

        console.log(
          'Eligible Premium shops loaded:',
          this.shops.length
        );

        console.log(
          'Shops with valid coordinates:',
          this.shopsWithLocation.length
        );

        setTimeout(() => {
          this.initializeOrUpdateMap();
        }, 350);

      },

      (error) => {

        this.clearLoadingTimeout();

        console.error(
          'Error loading premium shops:',
          error.code,
          error.message,
          error
        );

        this.shops = [];
        this.isLoading = false;

        if (error.code === 'permission-denied') {

          this.errorMessage =
            'Access denied. Please check your Firestore security rules.';

        } else {

          this.errorMessage =
            'Unable to load repair shops. Please check your internet connection and try again.';

        }

        this.cdr.detectChanges();

      }
    );
  }

  // CLEAR LOADING TIMEOUT

  private clearLoadingTimeout(): void {

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = undefined;
    }
  }

  // FILTER SHOPS

  get filteredShops(): ApprovedShop[] {

    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return this.shops;
    }

    return this.shops.filter((shop) =>

      shop.shopName.toLowerCase().includes(search) ||
      shop.ownerName.toLowerCase().includes(search) ||
      shop.address.toLowerCase().includes(search) ||
      shop.category.toLowerCase().includes(search) ||
      shop.description.toLowerCase().includes(search) ||
      shop.services.some((service) =>
        service.toLowerCase().includes(search)
      )

    );
  }

  // SHOPS WITH VALID MAP LOCATIONS

  get shopsWithLocation(): ApprovedShop[] {

    return this.shops.filter((shop) => {

      if (!shop.location) {
        return false;
      }

      const latitude = shop.location.latitude;
      const longitude = shop.location.longitude;

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      );
    });
  }

  // CUSTOM SHOP MARKER

  private createShopMarkerIcon(): L.DivIcon {

    const markerHtml = `
      <div style="
        width: 42px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      ">
        <svg
          width="42"
          height="50"
          viewBox="0 0 42 50"
          xmlns="http://www.w3.org/2000/svg"
          style="
            display: block;
            filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35));
          "
        >
          <path
            d="M21 49
               C16 40 3 27 3 18
               C3 8.6 11.1 1 21 1
               C30.9 1 39 8.6 39 18
               C39 27 26 40 21 49Z"
            fill="#23834c"
            stroke="#ffffff"
            stroke-width="2"
          />
          <circle
            cx="21"
            cy="18"
            r="8"
            fill="#ffffff"
          />
          <circle
            cx="21"
            cy="18"
            r="4"
            fill="#23834c"
          />
        </svg>
      </div>
    `;

    return L.divIcon({
      className: '',
      html: markerHtml,
      iconSize: [42, 50],
      iconAnchor: [21, 49],
      popupAnchor: [0, -45]
    });
  }

  // INITIALIZE OR UPDATE CUSTOMER MAP

  private initializeOrUpdateMap(): void {

    const mapElement = document.getElementById(
      'customerShopsMap'
    );

    if (!mapElement) {

      console.warn(
        'Customer shops map element was not found.'
      );

      return;
    }

    if (!this.map) {

      this.map = L.map(mapElement, {
        zoomControl: true
      }).setView([12.8797, 121.7740], 6);

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(this.map);

      this.markerLayer = L.layerGroup().addTo(this.map);

    }

    this.markerLayer?.clearLayers();

    const bounds: L.LatLngTuple[] = [];

    const markerIcon = this.createShopMarkerIcon();

    this.shopsWithLocation.forEach((shop) => {

      if (!shop.location) {
        return;
      }

      const latitude = shop.location.latitude;
      const longitude = shop.location.longitude;

      const marker = L.marker(
        [latitude, longitude],
        {
          icon: markerIcon,
          title: shop.shopName,
          alt: shop.shopName,
          riseOnHover: true
        }
      );

      const popupContent = document.createElement('div');

      const title = document.createElement('strong');
      title.textContent = shop.shopName;

      const address = document.createElement('p');
      address.textContent = shop.address;

      const premium = document.createElement('span');
      premium.textContent = 'Premium Shop';

      premium.style.color = '#23834c';
      premium.style.fontWeight = '700';

      popupContent.appendChild(title);
      popupContent.appendChild(address);
      popupContent.appendChild(premium);

      marker.bindPopup(popupContent);

      this.markerLayer?.addLayer(marker);

      bounds.push([
        latitude,
        longitude
      ]);

      console.log(
        'Customer map marker added:',
        shop.shopName,
        latitude,
        longitude
      );

    });

    if (bounds.length > 0) {

      if (bounds.length === 1) {

        this.map.setView(bounds[0], 14);

      } else {

        this.map.fitBounds(bounds, {
          padding: [40, 40],
          maxZoom: 14
        });

      }

    } else {

      this.map.setView([12.8797, 121.7740], 6);

      console.warn(
        'No approved Premium shops have valid map coordinates.'
      );

    }

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 300);
  }

  // VIEW SHOP DETAILS

  viewDetails(shop: ApprovedShop): void {

    this.router.navigate(
      ['/shop-details'],
      {
        state: { shop }
      }
    );
  }

  // COMPONENT CLEANUP

  ngOnDestroy(): void {

    this.clearLoadingTimeout();

    this.unsubscribeShops?.();

    this.map?.remove();

    this.map = undefined;
    this.markerLayer = undefined;
  }
}