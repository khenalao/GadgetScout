
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  gridOutline,
  storefrontOutline,
  peopleOutline,
  documentTextOutline,
  barChartOutline,
  settingsOutline,
  logOutOutline,
  menuOutline,
  closeOutline,
  constructOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  refreshOutline,
  timeOutline,
  personOutline,
  alertCircleOutline,
  cardOutline
} from 'ionicons/icons';

import { signOut } from 'firebase/auth';

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

import { auth, db } from '../../firebase';

interface ShopOwnerApplication {
  uid: string;
  name: string;
  email: string;
  status: string;
  createdAt?: any;
}

interface ShopProfile {
  uid: string;
  ownerName: string;
  email: string;
  shopName: string;
  contactNumber: string;
  address: string;
  category: string;
  description: string;
  services: string;
  profileStatus: string;
  createdAt?: any;
  updatedAt?: any;
}

interface PendingPayment {
  id: string;
  ownerUid: string;
  shopUid: string;
  shopName: string;
  plan: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gcashReferenceNumber: string;
  gcashSenderName: string;
  transactionDate: string;
  notes: string;
  status: string;
  submittedAt?: any;
  createdAt?: any;
}

interface DashboardNavItem {
  label: string;
  section: string;
  icon: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ]
})
export class AdminDashboardPage implements OnInit, OnDestroy {

  activeSection = 'dashboard';

  // SIDEBAR STATES
  mobileMenuOpen = false;
  isSidebarCollapsed = false;

  adminName = 'Administrator';

  totalCustomers = 0;
  totalShops = 0;
  approvedShops = 0;

  pendingApplications: ShopOwnerApplication[] = [];
  pendingShopProfiles: ShopProfile[] = [];
  pendingPayments: PendingPayment[] = [];

  loadingApplications = true;
  loadingShopProfiles = true;
  loadingPayments = true;
  loadingDashboard = true;

  updatingApplicationId: string | null = null;
  updatingProfileId: string | null = null;
  updatingPaymentId: string | null = null;

  errorMessage = '';
  successMessage = '';

  private unsubscribeApplications?: () => void;
  private unsubscribeShopProfiles?: () => void;
  private unsubscribePayments?: () => void;
  private unsubscribeCustomers?: () => void;
  private unsubscribeShops?: () => void;

  navItems: DashboardNavItem[] = [
    {
      label: 'Dashboard',
      section: 'dashboard',
      icon: 'grid-outline'
    },
    {
      label: 'Repair Shops',
      section: 'shops',
      icon: 'storefront-outline'
    },
    {
      label: 'Shop Applications',
      section: 'applications',
      icon: 'document-text-outline'
    },
    {
      label: 'Shop Profile Review',
      section: 'profile-review',
      icon: 'checkmark-circle-outline'
    },
    {
      label: 'Payment Verification',
      section: 'payments',
      icon: 'card-outline'
    },
    {
      label: 'Customers',
      section: 'customers',
      icon: 'people-outline'
    },
    {
      label: 'Reports',
      section: 'reports',
      icon: 'bar-chart-outline'
    },
    {
      label: 'Settings',
      section: 'settings',
      icon: 'settings-outline'
    }
  ];

  constructor(private router: Router) {
    addIcons({
      gridOutline,
      storefrontOutline,
      peopleOutline,
      documentTextOutline,
      barChartOutline,
      settingsOutline,
      logOutOutline,
      menuOutline,
      closeOutline,
      constructOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      refreshOutline,
      timeOutline,
      personOutline,
      alertCircleOutline,
      cardOutline
    });
  }

  ngOnInit(): void {
    console.log('========== ADMIN DASHBOARD ==========');
    console.log('Admin UID:', auth.currentUser?.uid);
    console.log('Authenticated:', !!auth.currentUser);
    console.log('Firebase Project:', db.app.options.projectId);

    this.loadApplications();
    this.loadShopProfiles();
    this.loadPendingPayments();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.unsubscribeApplications?.();
    this.unsubscribeShopProfiles?.();
    this.unsubscribePayments?.();
    this.unsubscribeCustomers?.();
    this.unsubscribeShops?.();
  }

  // PAGE TITLE
  get pageTitle(): string {
    const selected = this.navItems.find(
      item => item.section === this.activeSection
    );

    return selected?.label || 'Dashboard';
  }

  // SECTION NAVIGATION
  selectSection(section: string): void {
    this.activeSection = section;
    this.mobileMenuOpen = false;

    if (section === 'applications') {
      this.loadApplications();
    }

    if (section === 'profile-review') {
      this.loadShopProfiles();
    }

    if (section === 'payments') {
      this.loadPendingPayments();
    }
  }

  // MOBILE SIDEBAR
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  // DESKTOP SIDEBAR COLLAPSE / EXPAND
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // DASHBOARD DATA
  loadDashboardData(): void {
    this.loadingDashboard = true;

    const customersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'customer')
    );

    this.unsubscribeCustomers?.();

    this.unsubscribeCustomers = onSnapshot(
      customersQuery,
      snapshot => {
        this.totalCustomers = snapshot.size;
        this.loadingDashboard = false;

        console.log('Total customers:', snapshot.size);
      },
      error => {
        console.error('Customer count error:', error);
        this.loadingDashboard = false;
      }
    );

    this.unsubscribeShops?.();

    this.unsubscribeShops = onSnapshot(
      collection(db, 'shops'),
      snapshot => {
        this.totalShops = snapshot.size;

        this.approvedShops = snapshot.docs.filter(shop => {
          const data = shop.data();
          return data['profileStatus'] === 'approved';
        }).length;

        console.log('Total shop records:', snapshot.size);
        console.log('Approved shop profiles:', this.approvedShops);
      },
      error => {
        console.error('Repair shop count error:', error);
      }
    );
  }

  // SHOP OWNER APPLICATIONS
  loadApplications(): void {
    this.loadingApplications = true;
    this.errorMessage = '';

    this.unsubscribeApplications?.();

    const applicationsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'shopOwner'),
      where('status', '==', 'pending')
    );

    console.log('Loading pending shop owner applications...');

    this.unsubscribeApplications = onSnapshot(
      applicationsQuery,
      snapshot => {
        this.pendingApplications = snapshot.docs.map(document => {
          const data = document.data();

          return {
            uid: document.id,
            name: data['name'] || 'No name provided',
            email: data['email'] || 'No email provided',
            status: data['status'] || 'pending',
            createdAt: data['createdAt'] || null
          };
        });

        this.loadingApplications = false;

        console.log(
          'Pending applications found:',
          snapshot.size
        );
      },
      error => {
        console.error('Applications loading error:', error);

        this.errorMessage =
          'Unable to load shop applications. Please check your Firestore permissions.';

        this.pendingApplications = [];
        this.loadingApplications = false;
      }
    );
  }

  // SHOP PROFILE REVIEW
  loadShopProfiles(): void {
    this.loadingShopProfiles = true;
    this.errorMessage = '';

    this.unsubscribeShopProfiles?.();

    const profilesQuery = query(
      collection(db, 'shops'),
      where('profileStatus', '==', 'pending')
    );

    console.log('Loading pending shop profiles...');

    this.unsubscribeShopProfiles = onSnapshot(
      profilesQuery,
      snapshot => {
        this.pendingShopProfiles = snapshot.docs.map(document => {
          const data = document.data();

          return {
            uid: document.id,
            ownerName: data['ownerName'] || 'No owner name',
            email: data['email'] || 'No email provided',
            shopName: data['shopName'] || 'No shop name',
            contactNumber: data['contactNumber'] || 'Not provided',
            address: data['address'] || 'Not provided',
            category: data['category'] || 'Not specified',
            description: data['description'] || 'No description',
            services: data['services'] || 'Not specified',
            profileStatus: data['profileStatus'] || 'pending',
            createdAt: data['createdAt'] || null,
            updatedAt: data['updatedAt'] || null
          };
        });

        this.loadingShopProfiles = false;

        console.log(
          'Pending shop profiles found:',
          snapshot.size
        );
      },
      error => {
        console.error('Shop profiles loading error:', error);

        this.errorMessage =
          'Unable to load shop profiles. Please check your Firestore permissions.';

        this.pendingShopProfiles = [];
        this.loadingShopProfiles = false;
      }
    );
  }

  // PAYMENT VERIFICATION
  loadPendingPayments(): void {
    this.loadingPayments = true;
    this.unsubscribePayments?.();

    const paymentsQuery = query(
      collection(db, 'subscriptions'),
      where('status', '==', 'pending')
    );

    console.log('Loading pending GCash payments...');

    this.unsubscribePayments = onSnapshot(
      paymentsQuery,
      snapshot => {
        this.pendingPayments = snapshot.docs.map(document => {
          const data = document.data();

          return {
            id: document.id,
            ownerUid: data['ownerUid'] || '',
            shopUid: data['shopUid'] || data['ownerUid'] || '',
            shopName: data['shopName'] || 'Unnamed shop',
            plan: data['plan'] || 'monthly',
            amount: Number(data['amount'] || 199),
            currency: data['currency'] || 'PHP',
            paymentMethod: data['paymentMethod'] || 'GCash',
            gcashReferenceNumber:
              data['gcashReferenceNumber'] || '',
            gcashSenderName:
              data['gcashSenderName'] || '',
            transactionDate:
              data['transactionDate'] || '',
            notes: data['notes'] || '',
            status: data['status'] || 'pending',
            submittedAt: data['submittedAt'] || null,
            createdAt: data['createdAt'] || null
          };
        });

        this.loadingPayments = false;

        console.log(
          'Pending payment submissions:',
          this.pendingPayments.length
        );
      },
      error => {
        console.error('Payment loading error:', error);

        this.errorMessage =
          'Unable to load payment submissions. Please check your Firestore permissions.';

        this.pendingPayments = [];
        this.loadingPayments = false;
      }
    );
  }

  // APPROVE PAYMENT
  async approvePayment(payment: PendingPayment): Promise<void> {
    await this.updatePaymentStatus(payment, 'approved');
  }

  // REJECT PAYMENT
  async rejectPayment(payment: PendingPayment): Promise<void> {
    await this.updatePaymentStatus(payment, 'rejected');
  }

  // UPDATE PAYMENT AND SHOP SUBSCRIPTION
  private async updatePaymentStatus(
    payment: PendingPayment,
    newStatus: 'approved' | 'rejected'
  ): Promise<void> {

    if (this.updatingPaymentId) {
      return;
    }

    if (!auth.currentUser) {
      this.errorMessage =
        'Admin session not found. Please log in again.';
      return;
    }

    const shopUid = payment.shopUid || payment.ownerUid;

    if (!shopUid) {
      this.errorMessage =
        'The payment record does not contain a valid shop owner ID.';
      return;
    }

    this.updatingPaymentId = payment.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const batch = writeBatch(db);

      const paymentRef = doc(
        db,
        'subscriptions',
        payment.id
      );

      const shopRef = doc(
        db,
        'shops',
        shopUid
      );

      const paymentUpdate: any = {
        status: newStatus,
        verifiedAt: serverTimestamp(),
        verifiedBy: auth.currentUser.uid
      };

      if (newStatus === 'approved') {
        const startDate = new Date();
        const endDate = new Date(startDate);

        endDate.setDate(endDate.getDate() + 30);

        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        paymentUpdate['startDate'] = startTimestamp;
        paymentUpdate['endDate'] = endTimestamp;

        batch.update(paymentRef, paymentUpdate);

        // Activate premium subscription.
        // publicationStatus remains unchanged.
        batch.update(shopRef, {
          subscriptionStatus: 'active',
          subscriptionPlan: 'monthly',
          subscriptionStartDate: startTimestamp,
          subscriptionEndDate: endTimestamp
        });

      } else {
        batch.update(paymentRef, paymentUpdate);

        // Rejected payment does not activate subscription.
        // publicationStatus remains unchanged.
        batch.update(shopRef, {
          subscriptionStatus: 'inactive'
        });
      }

      await batch.commit();

      this.successMessage =
        newStatus === 'approved'
          ? `${payment.shopName} payment has been approved. Premium subscription is now active for 30 days.`
          : `${payment.shopName} payment has been rejected.`;

      console.log(
        `Payment ${payment.id} updated to ${newStatus}`
      );

    } catch (error) {
      console.error('Payment verification error:', error);

      this.errorMessage =
        'Unable to update this payment. Please check your Firestore rules and try again.';

    } finally {
      this.updatingPaymentId = null;
    }
  }

  // SHOP OWNER APPLICATION ACTIONS
  async approveApplication(
    application: ShopOwnerApplication
  ): Promise<void> {
    await this.updateApplicationStatus(application, 'approved');
  }

  async rejectApplication(
    application: ShopOwnerApplication
  ): Promise<void> {
    await this.updateApplicationStatus(application, 'rejected');
  }

  private async updateApplicationStatus(
    application: ShopOwnerApplication,
    newStatus: 'approved' | 'rejected'
  ): Promise<void> {

    if (
      this.updatingApplicationId ||
      this.updatingProfileId
    ) {
      return;
    }

    if (!auth.currentUser) {
      this.errorMessage =
        'Admin session not found. Please log in again.';
      return;
    }

    this.updatingApplicationId = application.uid;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const userDocument = doc(db, 'users', application.uid);

      await updateDoc(userDocument, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser.uid
      });

      this.successMessage =
        newStatus === 'approved'
          ? `${application.name} has been approved successfully.`
          : `${application.name}'s application has been rejected.`;

      console.log(
        `Application ${application.uid} updated to ${newStatus}`
      );

    } catch (error) {
      console.error('Application update error:', error);

      this.errorMessage =
        'Unable to update the application. Please check your Firestore rules and try again.';

    } finally {
      this.updatingApplicationId = null;
    }
  }

  // SHOP PROFILE ACTIONS
  async approveShopProfile(profile: ShopProfile): Promise<void> {
    await this.updateShopProfileStatus(profile, 'approved');
  }

  async rejectShopProfile(profile: ShopProfile): Promise<void> {
    await this.updateShopProfileStatus(profile, 'rejected');
  }

  private async updateShopProfileStatus(
    profile: ShopProfile,
    newStatus: 'approved' | 'rejected'
  ): Promise<void> {

    if (
      this.updatingApplicationId ||
      this.updatingProfileId
    ) {
      return;
    }

    if (!auth.currentUser) {
      this.errorMessage =
        'Admin session not found. Please log in again.';
      return;
    }

    this.updatingProfileId = profile.uid;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const shopDocument = doc(db, 'shops', profile.uid);

      await updateDoc(shopDocument, {
        profileStatus: newStatus,
        profileReviewedAt: serverTimestamp(),
        profileReviewedBy: auth.currentUser.uid
      });

      this.successMessage =
        newStatus === 'approved'
          ? `${profile.shopName} has been approved successfully.`
          : `${profile.shopName} has been rejected.`;

      console.log(
        `Shop profile ${profile.uid} updated to ${newStatus}`
      );

    } catch (error) {
      console.error('Shop profile update error:', error);

      this.errorMessage =
        'Unable to update the shop profile. Please check your Firestore rules and try again.';

    } finally {
      this.updatingProfileId = null;
    }
  }

  // TRACK BY FUNCTIONS
  trackByUid(
    index: number,
    application: ShopOwnerApplication
  ): string {
    return application.uid;
  }

  trackByProfileUid(
    index: number,
    profile: ShopProfile
  ): string {
    return profile.uid;
  }

  trackByPaymentId(
    index: number,
    payment: PendingPayment
  ): string {
    return payment.id;
  }

  // DATE FORMAT
  formatPaymentDate(value: any): string {
    if (!value) {
      return 'Not available';
    }

    try {
      const date = value?.toDate
        ? value.toDate()
        : new Date(value);

      if (isNaN(date.getTime())) {
        return 'Not available';
      }

      return date.toLocaleString();
    } catch {
      return 'Not available';
    }
  }

  // LOGOUT
  async logout(): Promise<void> {
    try {
      await signOut(auth);

      await this.router.navigateByUrl('/admin-login', {
        replaceUrl: true
      });

    } catch (error) {
      console.error('Admin logout error:', error);
      this.errorMessage = 'Unable to log out. Please try again.';
    }
  }
}
