
import {
  Component,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonSpinner,
  IonIcon,
  IonButton
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  constructOutline,
  closeOutline,
  homeOutline,
  businessOutline,
  locationOutline,
  personCircleOutline,
  logOutOutline,
  menuOutline,
  alertCircleOutline,
  refreshOutline,
  storefrontOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  timeOutline,
  informationCircleOutline,
  navigateOutline,
  saveOutline,
  cardOutline,
  cloudUploadOutline,
  imageOutline,
  checkmarkDoneCircleOutline,
  mailOutline,
  callOutline,
  shieldCheckmarkOutline,
  createOutline,
  addCircleOutline,
  trashOutline,
  phonePortraitOutline,
  laptopOutline,
  tabletPortraitOutline,
  desktopOutline,
  lockClosedOutline,
  walletOutline
} from 'ionicons/icons';

import { Router } from '@angular/router';

import {
  onAuthStateChanged,
  signOut,
  Unsubscribe
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

import * as L from 'leaflet';

import { auth, db } from '../../firebase';

type ShopSection =
  | 'dashboard'
  | 'shop-information'
  | 'services'
  | 'shop-location'
  | 'subscription-payment'
  | 'repair-requests';

interface ShopProfile {
  ownerUid?: string;
  shopName?: string;
  ownerName?: string;
  ownerEmail?: string;
  email?: string;
  phone?: string;
  contactNumber?: string;
  address?: string;
  description?: string;
  category?: string;
  services?: string[];
  profileStatus?: string;
  publicationStatus?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
  latitude?: number;
  longitude?: number;

  location?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };

  [key: string]: any;
}

interface SubscriptionRecord {
  id: string;
  status: string;
  shopName?: string;
  plan?: string;
  amount?: number;
  paymentMethod?: string;
  gcashReferenceNumber?: string;
  gcashSenderName?: string;
  transactionDate?: string;
  submittedAt?: any;
  verifiedAt?: any;
  notes?: string;
}

interface RepairRequest {
  id: string;
  shopUid: string;
  shopName: string;

  customerUid: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;

  serviceName: string;
  gadgetType: string;
  gadgetBrand: string;
  gadgetModel: string;
  issueDescription: string;

  // APPOINTMENT SCHEDULE
  appointmentDate?: string;
  appointmentTime?: string;

  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'in-progress'
    | 'completed';

  createdAt?: any;
  updatedAt?: any;
}

@Component({
  selector: 'app-shop-dashboard',
  templateUrl: './shop-dashboard.page.html',
  styleUrls: ['./shop-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
    IonIcon,
    IonButton
  ]
})
export class ShopDashboardPage implements OnDestroy {

  // DASHBOARD STATE

  isLoading = true;
  isSavingLocation = false;
  isLoggingOut = false;

  isSidebarCollapsed = false;
  mobileMenuOpen = false;

  activeSection: ShopSection = 'dashboard';

  readonly navItems: {
    section: ShopSection;
    label: string;
    icon: string;
  }[] = [
    {
      section: 'dashboard',
      label: 'Dashboard',
      icon: 'home-outline'
    },
    {
      section: 'shop-information',
      label: 'Shop Information',
      icon: 'business-outline'
    },
    {
      section: 'services',
      label: 'Services',
      icon: 'construct-outline'
    },
    {
      section: 'repair-requests',
      label: 'Repair Requests',
      icon: 'document-text-outline'
    },
    {
      section: 'shop-location',
      label: 'Shop Location',
      icon: 'location-outline'
    },
    {
      section: 'subscription-payment',
      label: 'Subscription & Payment',
      icon: 'card-outline'
    }
  ];

  errorMessage = '';
  successMessage = '';

  shop: ShopProfile | null = null;

  ownerName = '';
  ownerEmail = '';
  uid = '';

  // SERVICES MANAGEMENT STATE

  isEditingServices = false;
  isSavingServices = false;

  newServiceName = '';
  editableServices: string[] = [];

  servicesError = '';
  servicesSuccess = '';

  // REPAIR REQUESTS STATE

  repairRequests: RepairRequest[] = [];

  isLoadingRepairRequests = false;
  repairRequestsError = '';
  repairRequestsSuccess = '';

  updatingRequestId = '';

  // MAP STATE

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;

  hasSelectedLocation = false;
  hasSavedLocation = false;

  // PAYMENT STATE

  readonly premiumPrice = 199;

  gcashReferenceNumber = '';
  gcashSenderName = '';
  transactionDate = '';
  paymentNotes = '';

  paymentError = '';
  paymentSuccess = '';

  isSubmittingPayment = false;
  hasPendingPayment = false;

  latestPaymentStatus = 'inactive';
  latestPayment: SubscriptionRecord | null = null;

  // AUTH AND FIRESTORE LISTENERS

  private authUnsubscribe: Unsubscribe | null = null;
  private subscriptionUnsubscribe: Unsubscribe | null = null;
  private repairRequestsUnsubscribe: Unsubscribe | null = null;

  private destroyed = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {

    addIcons({
      constructOutline,
      closeOutline,
      homeOutline,
      businessOutline,
      locationOutline,
      personCircleOutline,
      logOutOutline,
      menuOutline,
      alertCircleOutline,
      refreshOutline,
      storefrontOutline,
      checkmarkCircleOutline,
      documentTextOutline,
      timeOutline,
      informationCircleOutline,
      navigateOutline,
      saveOutline,
      cardOutline,
      cloudUploadOutline,
      imageOutline,
      checkmarkDoneCircleOutline,
      mailOutline,
      callOutline,
      shieldCheckmarkOutline,
      createOutline,
      addCircleOutline,
      trashOutline,
      phonePortraitOutline,
      laptopOutline,
      tabletPortraitOutline,
      desktopOutline,
      lockClosedOutline,
      walletOutline
    });

    this.authUnsubscribe = onAuthStateChanged(
      auth,
      async (user) => {

        if (this.destroyed) return;

        if (!user) {

          this.isLoading = false;

          await this.router.navigateByUrl('/login', {
            replaceUrl: true
          });

          return;
        }

        this.uid = user.uid;
        this.ownerEmail = user.email || '';

        await this.loadShopDashboard();
      }
    );
  }

  // PAGE TITLE

  get pageTitle(): string {

    const selectedItem = this.navItems.find(
      item => item.section === this.activeSection
    );

    return selectedItem?.label || 'Dashboard';
  }

  // PENDING REQUEST COUNT

  get pendingRepairRequestsCount(): number {

    return this.repairRequests.filter(
      request => request.status === 'pending'
    ).length;
  }

  // SELECT DASHBOARD SECTION

  selectSection(section: ShopSection): void {

    if (this.activeSection === section) {

      this.closeMobileMenu();

      if (section === 'shop-location') {
        this.initializeMapAfterRender();
      }

      return;
    }

    if (this.activeSection === 'shop-location') {
      this.destroyMap();
    }

    this.activeSection = section;

    this.closeMobileMenu();

    this.cdr.detectChanges();

    if (section === 'shop-location') {
      this.initializeMapAfterRender();
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // INITIALIZE MAP AFTER SECTION RENDER

  private initializeMapAfterRender(): void {

    setTimeout(() => {

      if (
        this.destroyed ||
        this.activeSection !== 'shop-location'
      ) {
        return;
      }

      this.initializeMap();

      if (this.map) {
        this.map.invalidateSize();
      }

    }, 250);
  }

  // LOAD DASHBOARD

  async loadShopDashboard(): Promise<void> {

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {

      const user = auth.currentUser;

      if (!user) {
        throw new Error('Walang naka-login na account.');
      }

      this.uid = user.uid;

      const userRef = doc(db, 'users', this.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        throw new Error('Hindi makita ang user account.');
      }

      const userData = userSnapshot.data();

      if (userData['role'] !== 'shopOwner') {

        await this.router.navigateByUrl('/home', {
          replaceUrl: true
        });

        return;
      }

      if (userData['status'] !== 'approved') {

        await this.router.navigateByUrl('/login', {
          replaceUrl: true
        });

        return;
      }

      this.ownerName =
        userData['fullName'] ||
        userData['name'] ||
        userData['ownerName'] ||
        'Shop Owner';

      const shopRef = doc(db, 'shops', this.uid);
      const shopSnapshot = await getDoc(shopRef);

      if (!shopSnapshot.exists()) {
        throw new Error('Hindi makita ang shop profile mo.');
      }

      const shopData = shopSnapshot.data();

      this.shop = {
        ...shopData,
        services: this.normalizeServices(shopData['services'])
      };

      if (this.shop.ownerUid !== this.uid) {
        throw new Error(
          'Hindi tumutugma ang shop ownership sa iyong account.'
        );
      }

      if (this.shop.profileStatus !== 'approved') {

        this.errorMessage =
          'Hindi pa approved ang iyong shop profile.';

        return;
      }

      this.loadSavedLocation();
      this.loadSubscriptionStatus();
      this.loadRepairRequests();

    } catch (error: any) {

      console.error('Dashboard loading error:', error);

      this.errorMessage =
        error.message || 'Hindi ma-load ang shop dashboard.';

    } finally {

      this.isLoading = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // NORMALIZE SERVICES

  private normalizeServices(value: any): string[] {

    if (Array.isArray(value)) {

      return value
        .filter((service: any) => typeof service === 'string')
        .map((service: string) => service.trim())
        .filter((service: string) => service.length > 0);
    }

    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      value.trim().toLowerCase() !== 'all'
    ) {
      return [value.trim()];
    }

    return [];
  }

  // OPEN SERVICES EDITOR

  openServicesEditor(): void {

    if (!this.shop) return;

    this.editableServices = [
      ...(this.shop.services || [])
    ];

    this.newServiceName = '';

    this.servicesError = '';
    this.servicesSuccess = '';

    this.isEditingServices = true;

    this.cdr.detectChanges();
  }

  // HANDLE NEW SERVICE INPUT

  onNewServiceInput(event: Event): void {

    const target = event.target as HTMLInputElement;

    this.newServiceName = target.value;
  }

  // ADD SERVICE

  addService(): void {

    const serviceName = this.newServiceName.trim();

    this.servicesError = '';
    this.servicesSuccess = '';

    if (!serviceName) {

      this.servicesError =
        'Ilagay muna ang pangalan ng service.';

      return;
    }

    if (serviceName.length > 60) {

      this.servicesError =
        'Hanggang 60 characters lamang ang service name.';

      return;
    }

    const alreadyExists = this.editableServices.some(
      service =>
        service.toLowerCase() === serviceName.toLowerCase()
    );

    if (alreadyExists) {

      this.servicesError =
        'Nasa listahan na ang service na ito.';

      return;
    }

    if (this.editableServices.length >= 30) {

      this.servicesError =
        'Hanggang 30 services lamang ang maaaring idagdag.';

      return;
    }

    this.editableServices = [
      ...this.editableServices,
      serviceName
    ];

    this.newServiceName = '';
    this.servicesError = '';

    this.cdr.detectChanges();
  }

  // REMOVE SERVICE

  removeService(index: number): void {

    if (
      index < 0 ||
      index >= this.editableServices.length
    ) {
      return;
    }

    this.editableServices = this.editableServices.filter(
      (_, serviceIndex) => serviceIndex !== index
    );

    this.servicesError = '';

    this.cdr.detectChanges();
  }

  // CANCEL SERVICES EDITING

  cancelServicesEdit(): void {

    this.isEditingServices = false;

    this.newServiceName = '';
    this.editableServices = [];

    this.servicesError = '';
    this.servicesSuccess = '';

    this.cdr.detectChanges();
  }

  // SAVE SERVICES TO FIRESTORE

  async saveServices(): Promise<void> {

    if (!this.uid || !this.shop) {

      this.servicesError =
        'Hindi makita ang shop account.';

      return;
    }

    if (this.shop.ownerUid !== this.uid) {

      this.servicesError =
        'Hindi ma-verify ang ownership ng shop.';

      return;
    }

    if (this.shop.profileStatus !== 'approved') {

      this.servicesError =
        'Approved shop profiles lamang ang maaaring mag-edit ng services.';

      return;
    }

    if (this.isSavingServices) return;

    const cleanedServices = this.editableServices
      .map(service => service.trim())
      .filter(service => service.length > 0);

    if (cleanedServices.length > 30) {

      this.servicesError =
        'Hanggang 30 services lamang ang maaaring i-save.';

      return;
    }

    const uniqueServices = new Set(
      cleanedServices.map(service => service.toLowerCase())
    );

    if (uniqueServices.size !== cleanedServices.length) {

      this.servicesError =
        'May duplicate na service. Alisin muna ang duplicate bago mag-save.';

      return;
    }

    this.isSavingServices = true;

    this.servicesError = '';
    this.servicesSuccess = '';

    try {

      const shopRef = doc(db, 'shops', this.uid);

      await updateDoc(shopRef, {
        services: cleanedServices,
        updatedAt: serverTimestamp()
      });

      this.shop.services = cleanedServices;

      this.editableServices = [
        ...cleanedServices
      ];

      this.servicesSuccess =
        'Matagumpay na na-update ang repair services ng iyong shop.';

      this.isEditingServices = false;

    } catch (error: any) {

      console.error('Save services error:', error);

      this.servicesError =
        error.message ||
        'Hindi ma-save ang services. Subukan ulit.';

    } finally {

      this.isSavingServices = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // ==========================================
  // REPAIR REQUESTS MANAGEMENT
  // ==========================================

  // LOAD REAL-TIME REPAIR REQUESTS

  private loadRepairRequests(): void {

    if (!this.uid || !this.shop) return;

    this.repairRequestsUnsubscribe?.();

    this.isLoadingRepairRequests = true;
    this.repairRequestsError = '';

    const requestsQuery = query(
      collection(db, 'repairRequests'),
      where('shopUid', '==', this.uid)
    );

    this.repairRequestsUnsubscribe = onSnapshot(
      requestsQuery,

      (snapshot) => {

        this.repairRequests = snapshot.docs.map(
          requestDocument => {

            const data = requestDocument.data();

            return {
              id: requestDocument.id,

              shopUid: data['shopUid'] || '',
              shopName: data['shopName'] || '',

              customerUid: data['customerUid'] || '',
              customerName: data['customerName'] || 'Customer',
              customerEmail: data['customerEmail'] || '',
              customerContact: data['customerContact'] || '',

              serviceName: data['serviceName'] || '',
              gadgetType: data['gadgetType'] || '',
              gadgetBrand: data['gadgetBrand'] || '',
              gadgetModel: data['gadgetModel'] || '',
              issueDescription: data['issueDescription'] || '',

              // APPOINTMENT SCHEDULE
              appointmentDate: data['appointmentDate'] || '',
              appointmentTime: data['appointmentTime'] || '',

              status: data['status'] || 'pending',

              createdAt: data['createdAt'] || null,
              updatedAt: data['updatedAt'] || null
            } as RepairRequest;
          }
        );

        // Newest requests appear first.
        this.repairRequests.sort(
          (a, b) =>
            this.getTimestampValue(b.createdAt) -
            this.getTimestampValue(a.createdAt)
        );

        this.isLoadingRepairRequests = false;
        this.repairRequestsError = '';

        if (!this.destroyed) {
          this.cdr.detectChanges();
        }
      },

      (error) => {

        console.error(
          'Repair requests listener error:',
          error
        );

        this.isLoadingRepairRequests = false;

        this.repairRequestsError =
          'Hindi ma-load ang repair requests. Pakisubukan ulit.';

        if (!this.destroyed) {
          this.cdr.detectChanges();
        }
      }
    );
  }

  // REFRESH REPAIR REQUESTS

  refreshRepairRequests(): void {

    this.loadRepairRequests();
  }

  // UPDATE REQUEST STATUS

  async updateRepairRequestStatus(
    request: RepairRequest,
    newStatus: RepairRequest['status']
  ): Promise<void> {

    if (!this.uid || !this.shop) {

      this.repairRequestsError =
        'Hindi ma-verify ang shop account.';

      return;
    }

    if (request.shopUid !== this.uid) {

      this.repairRequestsError =
        'Hindi mo maaaring baguhin ang request na ito.';

      return;
    }

    if (this.shop.ownerUid !== this.uid) {

      this.repairRequestsError =
        'Hindi ma-verify ang ownership ng shop.';

      return;
    }

    if (this.shop.profileStatus !== 'approved') {

      this.repairRequestsError =
        'Approved shop profiles lamang ang maaaring mag-update ng requests.';

      return;
    }

    const allowedTransitions: Record<
      RepairRequest['status'],
      RepairRequest['status'][]
    > = {
      pending: ['accepted', 'rejected'],
      accepted: ['in-progress'],
      rejected: [],
      'in-progress': ['completed'],
      completed: []
    };

    if (!allowedTransitions[request.status]?.includes(newStatus)) {

      this.repairRequestsError =
        'Hindi pinapayagan ang status transition na ito.';

      return;
    }

    if (this.updatingRequestId) return;

    this.updatingRequestId = request.id;
    this.repairRequestsError = '';
    this.repairRequestsSuccess = '';

    try {

      const requestRef = doc(
        db,
        'repairRequests',
        request.id
      );

      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      const statusMessages: Record<string, string> = {
        accepted: 'Tinanggap na ang repair request.',
        rejected: 'Na-reject na ang repair request.',
        'in-progress': 'Nagsimula na ang repair service.',
        completed: 'Minarkahan na bilang completed ang repair.'
      };

      this.repairRequestsSuccess =
        statusMessages[newStatus] ||
        'Matagumpay na na-update ang request.';

    } catch (error: any) {

      console.error(
        'Update repair request status error:',
        error
      );

      this.repairRequestsError =
        error.message ||
        'Hindi ma-update ang request status. Subukan ulit.';

    } finally {

      this.updatingRequestId = '';

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // ACCEPT REQUEST

  acceptRequest(request: RepairRequest): void {

    this.updateRepairRequestStatus(
      request,
      'accepted'
    );
  }

  // REJECT REQUEST

  rejectRequest(request: RepairRequest): void {

    this.updateRepairRequestStatus(
      request,
      'rejected'
    );
  }

  // START REPAIR

  startRequest(request: RepairRequest): void {

    this.updateRepairRequestStatus(
      request,
      'in-progress'
    );
  }

  // COMPLETE REPAIR

  completeRequest(request: RepairRequest): void {

    this.updateRepairRequestStatus(
      request,
      'completed'
    );
  }

  // GET STATUS LABEL

  getRequestStatusLabel(status: string): string {

    switch (status) {

      case 'pending':
        return 'Pending';

      case 'accepted':
        return 'Accepted';

      case 'rejected':
        return 'Rejected';

      case 'in-progress':
        return 'In Progress';

      case 'completed':
        return 'Completed';

      default:
        return 'Unknown';
    }
  }

  // GET REQUEST DATE

  getRequestDate(value: any): Date | null {

    if (!value) return null;

    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime())
      ? null
      : parsedDate;
  }

  // REFRESH DASHBOARD

  async refreshDashboard(): Promise<void> {

    this.destroyMap();

    await this.loadShopDashboard();

    if (this.activeSection === 'shop-location') {
      this.initializeMapAfterRender();
    }
  }

  // LOAD SAVED LOCATION

  private loadSavedLocation(): void {

    if (!this.shop) return;

    const location = this.shop.location;

    const latitude =
      location?.lat ??
      location?.latitude ??
      this.shop.latitude;

    const longitude =
      location?.lng ??
      location?.longitude ??
      this.shop.longitude;

    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {

      this.selectedLatitude = latitude;
      this.selectedLongitude = longitude;

      this.hasSelectedLocation = true;
      this.hasSavedLocation = true;

    } else {

      this.selectedLatitude = null;
      this.selectedLongitude = null;

      this.hasSelectedLocation = false;
      this.hasSavedLocation = false;
    }
  }

  // INITIALIZE MAP

  private initializeMap(): void {

    const mapElement = document.getElementById('shopMap');

    if (!mapElement) {
      console.warn('Shop map element was not found.');
      return;
    }

    if (this.map) {
      this.destroyMap();
    }

    const defaultLatitude = this.selectedLatitude ?? 12.3051;
    const defaultLongitude = this.selectedLongitude ?? 121.0930;

    this.map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(
      [defaultLatitude, defaultLongitude],
      this.hasSavedLocation ? 16 : 12
    );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    ).addTo(this.map);

    if (
      this.selectedLatitude !== null &&
      this.selectedLongitude !== null
    ) {

      this.addMarker(
        this.selectedLatitude,
        this.selectedLongitude
      );
    }

    this.map.on('click', (event: L.LeafletMouseEvent) => {

      this.selectedLatitude = event.latlng.lat;
      this.selectedLongitude = event.latlng.lng;

      this.hasSelectedLocation = true;
      this.hasSavedLocation = false;

      this.addMarker(
        event.latlng.lat,
        event.latlng.lng
      );

      this.cdr.detectChanges();
    });

    setTimeout(() => {

      if (
        this.map &&
        !this.destroyed &&
        this.activeSection === 'shop-location'
      ) {
        this.map.invalidateSize();
      }

    }, 500);
  }

  // CREATE OR MOVE MAP MARKER

  private addMarker(
    latitude: number,
    longitude: number
  ): void {

    if (!this.map) return;

    if (this.marker) {

      this.marker.setLatLng([latitude, longitude]);

      return;
    }

    const customIcon = L.divIcon({

      className: 'gadgetscout-location-marker',

      html: `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="48"
          viewBox="0 0 40 48"
          style="display:block;overflow:visible;"
        >
          <path
            d="M20 1C9.5 1 1 9.5 1 20c0 13 19 27 19 27s19-14 19-27C39 9.5 30.5 1 20 1Z"
            fill="#16a34a"
            stroke="#ffffff"
            stroke-width="2"
          />
          <circle
            cx="20"
            cy="19"
            r="7"
            fill="#ffffff"
          />
        </svg>
      `,

      iconSize: [40, 48],
      iconAnchor: [20, 47]
    });

    this.marker = L.marker(
      [latitude, longitude],
      {
        icon: customIcon,
        draggable: true,
        autoPan: true
      }
    ).addTo(this.map);

    this.marker.on('dragend', () => {

      const position = this.marker?.getLatLng();

      if (!position) return;

      this.selectedLatitude = position.lat;
      this.selectedLongitude = position.lng;

      this.hasSelectedLocation = true;
      this.hasSavedLocation = false;

      this.cdr.detectChanges();
    });
  }

  // USE CURRENT LOCATION

  useCurrentLocation(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (!navigator.geolocation) {

      this.errorMessage =
        'Hindi suportado ng browser ang location services.';

      return;
    }

    navigator.geolocation.getCurrentPosition(

      (position) => {

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        this.selectedLatitude = latitude;
        this.selectedLongitude = longitude;

        this.hasSelectedLocation = true;
        this.hasSavedLocation = false;

        if (this.map) {

          this.map.setView(
            [latitude, longitude],
            17
          );

          this.addMarker(latitude, longitude);

        } else {

          this.initializeMapAfterRender();
        }

        this.cdr.detectChanges();
      },

      (error) => {

        console.error('Geolocation error:', error);

        this.errorMessage =
          'Hindi makuha ang iyong current location. Payagan ang location access sa browser.';

        this.cdr.detectChanges();
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  // SAVE SHOP LOCATION

  async saveLocation(): Promise<void> {

    if (!this.uid || !this.shop) {

      this.errorMessage =
        'Hindi makita ang shop account.';

      return;
    }

    if (
      this.selectedLatitude === null ||
      this.selectedLongitude === null
    ) {

      this.errorMessage =
        'Pumili muna ng location sa map.';

      return;
    }

    if (this.isSavingLocation) return;

    this.isSavingLocation = true;

    this.errorMessage = '';
    this.successMessage = '';

    try {

      const latitude = this.selectedLatitude;
      const longitude = this.selectedLongitude;

      const shopRef = doc(db, 'shops', this.uid);

      if (this.map) {

        this.addMarker(latitude, longitude);

        this.map.setView(
          [latitude, longitude],
          17
        );
      }

      await updateDoc(shopRef, {

        latitude,
        longitude,

        location: {
          lat: latitude,
          lng: longitude
        },

        updatedAt: serverTimestamp()

      });

      this.shop.latitude = latitude;
      this.shop.longitude = longitude;

      this.shop.location = {
        lat: latitude,
        lng: longitude
      };

      this.selectedLatitude = latitude;
      this.selectedLongitude = longitude;

      this.hasSelectedLocation = true;
      this.hasSavedLocation = true;

      this.successMessage =
        'Matagumpay na na-save ang shop location.';

      setTimeout(() => {

        if (
          this.map &&
          !this.destroyed &&
          this.activeSection === 'shop-location'
        ) {

          this.map.invalidateSize();

          this.map.setView(
            [latitude, longitude],
            17
          );

          this.addMarker(latitude, longitude);
        }

      }, 200);

    } catch (error: any) {

      console.error('Save location error:', error);

      this.errorMessage =
        error.message || 'Hindi ma-save ang shop location.';

    } finally {

      this.isSavingLocation = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // CONVERT FIRESTORE DATE TO MILLISECONDS

  private getTimestampValue(value: any): number {

    if (!value) return 0;

    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'string' || typeof value === 'number') {

      const parsed = new Date(value).getTime();

      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  // LOAD REAL-TIME SUBSCRIPTION STATUS

  private loadSubscriptionStatus(): void {

    if (!this.uid || !this.shop) return;

    this.subscriptionUnsubscribe?.();

    const subscriptionsQuery = query(
      collection(db, 'subscriptions'),
      where('ownerUid', '==', this.uid)
    );

    this.subscriptionUnsubscribe = onSnapshot(
      subscriptionsQuery,

      (snapshot) => {

        const records: SubscriptionRecord[] =
          snapshot.docs.map((paymentDocument) => {

            const data = paymentDocument.data();

            return {
              id: paymentDocument.id,
              status: data['status'] || 'inactive',
              shopName: data['shopName'] || '',
              plan: data['plan'] || '',
              amount: data['amount'] || 0,
              paymentMethod: data['paymentMethod'] || '',
              gcashReferenceNumber:
                data['gcashReferenceNumber'] || '',
              gcashSenderName:
                data['gcashSenderName'] || '',
              transactionDate:
                data['transactionDate'] || '',
              submittedAt: data['submittedAt'] || null,
              verifiedAt: data['verifiedAt'] || null,
              notes: data['notes'] || ''
            };
          });

        records.sort((a, b) =>
          this.getTimestampValue(b.submittedAt) -
          this.getTimestampValue(a.submittedAt)
        );

        this.latestPayment = records.length > 0
          ? records[0]
          : null;

        this.hasPendingPayment = records.some(
          record => record.status === 'pending'
        );

        if (this.latestPayment) {

          this.latestPaymentStatus =
            this.latestPayment.status;

          if (this.latestPayment.status === 'approved') {

            this.shop!.subscriptionStatus = 'active';

          } else {

            this.shop!.subscriptionStatus =
              this.latestPayment.status;
          }

        } else {

          this.latestPaymentStatus =
            this.shop?.subscriptionStatus || 'inactive';

          if (this.latestPaymentStatus === 'pending') {
            this.latestPaymentStatus = 'inactive';
          }
        }

        if (!this.destroyed) {
          this.cdr.detectChanges();
        }

        console.log(
          'Latest payment status:',
          this.latestPaymentStatus
        );
      },

      (error) => {

        console.error(
          'Unable to listen to subscription status:',
          error
        );

        if (!this.destroyed) {
          this.cdr.detectChanges();
        }
      }
    );
  }

  // PAYMENT STATUS LABEL

  get paymentStatusLabel(): string {

    switch (this.latestPaymentStatus) {

      case 'pending':
        return 'Pending Verification';

      case 'approved':
        return 'Approved';

      case 'rejected':
        return 'Rejected';

      case 'active':
        return 'Active';

      default:
        return 'No Active Subscription';
    }
  }

  // SUBMIT GCASH PAYMENT DETAILS

  async submitPayment(): Promise<void> {

    const user = auth.currentUser;

    if (!user || !this.uid || !this.shop) {

      this.paymentError =
        'Hindi ma-verify ang iyong account. Mag-login ulit.';

      return;
    }

    if (this.hasPendingPayment) {

      this.paymentError =
        'May pending payment submission ka pa. Hintayin muna ang verification ng Admin.';

      return;
    }

    const referenceNumber = this.gcashReferenceNumber.trim();
    const senderName = this.gcashSenderName.trim();
    const paymentDate = this.transactionDate;
    const notes = this.paymentNotes.trim();

    if (referenceNumber.length < 6 || referenceNumber.length > 50) {

      this.paymentError =
        'Ilagay ang valid GCash reference number (6 hanggang 50 characters).';

      return;
    }

    if (senderName.length < 2 || senderName.length > 100) {

      this.paymentError =
        'Ilagay ang pangalan ng GCash sender (2 hanggang 100 characters).';

      return;
    }

    if (!paymentDate) {

      this.paymentError =
        'Piliin ang petsa ng iyong GCash transaction.';

      return;
    }

    if (notes.length > 500) {

      this.paymentError =
        'Ang optional notes ay hanggang 500 characters lamang.';

      return;
    }

    if (this.isSubmittingPayment) return;

    this.isSubmittingPayment = true;

    this.paymentError = '';
    this.paymentSuccess = '';

    try {

      const pendingQuery = query(
        collection(db, 'subscriptions'),
        where('ownerUid', '==', this.uid),
        where('status', '==', 'pending')
      );

      const pendingSnapshot = await getDocs(pendingQuery);

      if (!pendingSnapshot.empty) {

        this.hasPendingPayment = true;
        this.latestPaymentStatus = 'pending';
        this.shop.subscriptionStatus = 'pending';

        throw new Error(
          'May pending payment submission ka pa. Hintayin muna ang verification ng Admin.'
        );
      }

      const paymentData: any = {

        ownerUid: this.uid,
        shopUid: this.uid,
        shopName: this.shop.shopName || '',

        plan: 'monthly',
        amount: this.premiumPrice,
        currency: 'PHP',
        paymentMethod: 'GCash',

        gcashReferenceNumber: referenceNumber,
        gcashSenderName: senderName,
        transactionDate: paymentDate,

        status: 'pending',

        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      if (notes) {
        paymentData.notes = notes;
      }

      await addDoc(
        collection(db, 'subscriptions'),
        paymentData
      );

      this.shop.subscriptionStatus = 'pending';
      this.latestPaymentStatus = 'pending';
      this.hasPendingPayment = true;

      this.paymentSuccess =
        'Matagumpay na na-submit ang iyong GCash payment details. Naghihintay na ito ng Admin verification.';

      this.gcashReferenceNumber = '';
      this.gcashSenderName = '';
      this.transactionDate = '';
      this.paymentNotes = '';

    } catch (error: any) {

      console.error(
        'Payment submission error:',
        error
      );

      this.paymentError =
        error.message ||
        'May error sa pag-submit ng GCash payment details.';

    } finally {

      this.isSubmittingPayment = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // DESKTOP SIDEBAR

  toggleSidebar(): void {

    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // MOBILE SIDEBAR

  toggleMobileMenu(): void {

    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {

    this.mobileMenuOpen = false;
  }

  // LOGOUT

  async logout(): Promise<void> {

    if (this.isLoggingOut) return;

    this.isLoggingOut = true;

    try {

      await signOut(auth);

      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });

    } catch (error: any) {

      console.error('Logout error:', error);

      this.errorMessage =
        'Hindi matagumpay ang pag-logout.';

    } finally {

      this.isLoggingOut = false;
      this.cdr.detectChanges();
    }
  }

  // DESTROY MAP

  private destroyMap(): void {

    if (this.map) {

      this.map.off();
      this.map.remove();

      this.map = null;
    }

    this.marker = null;
  }

  // COMPONENT CLEANUP

  ngOnDestroy(): void {

    this.destroyed = true;

    this.authUnsubscribe?.();
    this.authUnsubscribe = null;

    this.subscriptionUnsubscribe?.();
    this.subscriptionUnsubscribe = null;

    this.repairRequestsUnsubscribe?.();
    this.repairRequestsUnsubscribe = null;

    this.destroyMap();
  }
}
