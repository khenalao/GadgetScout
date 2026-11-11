
import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSearchbar
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  documentTextOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  constructOutline,
  refreshOutline,
  alertCircleOutline,
  storefrontOutline,
  star,
  starOutline,
  shieldCheckmarkOutline,
  calendarOutline,
  fingerPrintOutline,
  searchOutline
} from 'ionicons/icons';

import { Router } from '@angular/router';

import {
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';

import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../../firebase';

interface RepairRequest {
  id: string;
  shopUid: string;
  shopName: string;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  serviceName: string;

  // APPOINTMENT SCHEDULE
  appointmentDate: string;
  appointmentTime: string;

  gadgetType: string;
  gadgetBrand: string;
  gadgetModel: string;
  issueDescription: string;
  status: string;
  createdAt: any;
  updatedAt: any;
}

@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.page.html',
  styleUrls: ['./my-requests.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSearchbar
  ]
})
export class MyRequestsPage implements OnInit, OnDestroy {

  requests: RepairRequest[] = [];

  // SEARCH
  searchText = '';

  get filteredRequests(): RepairRequest[] {

    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return this.requests;
    }

    return this.requests.filter((request) => {

      const searchableFields = [
        request.shopName,
        request.serviceName,
        request.appointmentDate,
        request.appointmentTime,
        request.gadgetType,
        request.gadgetBrand,
        request.gadgetModel,
        request.customerContact,
        request.issueDescription,
        request.id,
        request.status,
        this.getStatusLabel(request.status),
        this.getAppointmentStatusLabel(request.status)
      ];

      return searchableFields.some((field) =>
        String(field || '').toLowerCase().includes(search)
      );
    });
  }

  isLoading = true;
  errorMessage = '';

  // RATINGS AND REVIEWS
  ratingSelections: Record<string, number> = {};
  reviewTexts: Record<string, string> = {};
  reviewedRequests: Record<string, boolean> = {};
  submittingReviews: Record<string, boolean> = {};
  reviewErrors: Record<string, string> = {};
  reviewSuccess: Record<string, string> = {};

  private authUnsubscribe: Unsubscribe | null = null;
  private requestsUnsubscribe: Unsubscribe | null = null;

  private destroyed = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      documentTextOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      constructOutline,
      refreshOutline,
      alertCircleOutline,
      storefrontOutline,
      star,
      starOutline,
      shieldCheckmarkOutline,
      calendarOutline,
      fingerPrintOutline,
      searchOutline
    });
  }

  ngOnInit(): void {

    this.authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {

        if (this.destroyed) return;

        if (!user) {

          this.isLoading = false;

          this.router.navigateByUrl('/login', {
            replaceUrl: true
          });

          return;
        }

        this.listenToCustomerRequests(user.uid);
      }
    );
  }

  // LOAD CUSTOMER REQUESTS IN REAL TIME
  private listenToCustomerRequests(customerUid: string): void {

    this.isLoading = true;
    this.errorMessage = '';

    this.requestsUnsubscribe?.();

    const requestsQuery = query(
      collection(db, 'repairRequests'),
      where('customerUid', '==', customerUid)
    );

    this.requestsUnsubscribe = onSnapshot(
      requestsQuery,

      async (snapshot) => {

        this.requests = snapshot.docs.map((requestDocument) => {

          const data = requestDocument.data();

          return {
            id: requestDocument.id,
            shopUid: data['shopUid'] || '',
            shopName: data['shopName'] || 'Repair Shop',
            customerUid: data['customerUid'] || '',
            customerName: data['customerName'] || '',
            customerEmail: data['customerEmail'] || '',
            customerContact: data['customerContact'] || '',
            serviceName: data['serviceName'] || '',

            // APPOINTMENT SCHEDULE FROM FIRESTORE
            appointmentDate: data['appointmentDate'] || '',
            appointmentTime: data['appointmentTime'] || '',

            gadgetType: data['gadgetType'] || '',
            gadgetBrand: data['gadgetBrand'] || '',
            gadgetModel: data['gadgetModel'] || '',
            issueDescription: data['issueDescription'] || '',
            status: data['status'] || 'pending',
            createdAt: data['createdAt'] || null,
            updatedAt: data['updatedAt'] || null
          };
        });

        this.requests.sort(
          (a, b) =>
            this.getTimestampValue(b.createdAt) -
            this.getTimestampValue(a.createdAt)
        );

        await this.loadExistingReviews(customerUid);

        if (this.destroyed) return;

        this.isLoading = false;
        this.cdr.detectChanges();
      },

      (error) => {

        console.error('My Requests loading error:', error);

        this.errorMessage =
          'Hindi ma-load ang iyong repair requests. Tingnan kung na-publish na ang Firestore rules.';

        this.isLoading = false;

        if (!this.destroyed) {
          this.cdr.detectChanges();
        }
      }
    );
  }

  // APPOINTMENT STATUS LABEL
  getAppointmentStatusLabel(status: string): string {

    switch (status) {
      case 'pending':
        return 'Pending Confirmation';

      case 'accepted':
      case 'in-progress':
      case 'completed':
        return 'Confirmed';

      case 'rejected':
        return 'Not Accepted';

      default:
        return 'Not Available';
    }
  }

  // APPOINTMENT STATUS MESSAGE
  getAppointmentStatusMessage(status: string): string {

    switch (status) {
      case 'pending':
        return 'Your preferred appointment schedule is waiting for confirmation from the repair shop.';

      case 'accepted':
        return 'The repair shop has confirmed your requested appointment schedule.';

      case 'in-progress':
        return 'Your appointment has been confirmed and your repair is in progress.';

      case 'completed':
        return 'Your appointment was confirmed and the repair has been completed.';

      case 'rejected':
        return 'The repair shop did not accept your requested appointment schedule. Please contact the shop if you want to arrange another schedule.';

      default:
        return 'Appointment schedule information is currently unavailable.';
    }
  }

  // LOAD EXISTING CUSTOMER REVIEWS
  private async loadExistingReviews(customerUid: string): Promise<void> {

    try {

      const reviewsQuery = query(
        collection(db, 'shopReviews'),
        where('customerUid', '==', customerUid)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);

      this.reviewedRequests = {};

      reviewsSnapshot.forEach((reviewDocument) => {
        this.reviewedRequests[reviewDocument.id] = true;
      });

    } catch (error) {

      console.error('Unable to load existing reviews:', error);
    }
  }

  // SELECT STAR RATING
  setRating(requestId: string, rating: number): void {

    if (rating < 1 || rating > 5) return;

    this.ratingSelections[requestId] = rating;
    this.reviewErrors[requestId] = '';
    this.reviewSuccess[requestId] = '';
  }

  // CHECK SELECTED STAR
  isStarSelected(requestId: string, starNumber: number): boolean {

    return (this.ratingSelections[requestId] || 0) >= starNumber;
  }

  // SUBMIT CUSTOMER REVIEW
  async submitReview(request: RepairRequest): Promise<void> {

    const requestId = request.id;

    this.reviewErrors[requestId] = '';
    this.reviewSuccess[requestId] = '';

    const user = auth.currentUser;

    if (!user) {
      this.reviewErrors[requestId] =
        'Kailangan mong mag-login bago mag-submit ng review.';
      return;
    }

    if (request.status !== 'completed') {
      this.reviewErrors[requestId] =
        'Completed repair requests lamang ang maaaring i-rate.';
      return;
    }

    if (this.reviewedRequests[requestId]) {
      this.reviewErrors[requestId] =
        'May naisumite ka nang review para sa repair request na ito.';
      return;
    }

    if (this.submittingReviews[requestId]) return;

    const rating = this.ratingSelections[requestId] || 0;
    const review = (this.reviewTexts[requestId] || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      this.reviewErrors[requestId] =
        'Pumili muna ng rating mula 1 hanggang 5 stars.';
      return;
    }

    if (review.length > 1000) {
      this.reviewErrors[requestId] =
        'Ang review ay hanggang 1,000 characters lamang.';
      return;
    }

    this.submittingReviews[requestId] = true;

    try {

      const customerSnapshot = await getDoc(
        doc(db, 'users', user.uid)
      );

      if (!customerSnapshot.exists()) {
        throw new Error('Hindi makita ang iyong customer account.');
      }

      const customerData = customerSnapshot.data();

      if (
        customerData['role'] !== 'customer' ||
        customerData['status'] !== 'active'
      ) {
        throw new Error(
          'Active customer account lamang ang maaaring mag-submit ng review.'
        );
      }

      const requestSnapshot = await getDoc(
        doc(db, 'repairRequests', requestId)
      );

      if (!requestSnapshot.exists()) {
        throw new Error('Hindi makita ang repair request na ito.');
      }

      const requestData = requestSnapshot.data();

      if (
        requestData['customerUid'] !== user.uid ||
        requestData['status'] !== 'completed' ||
        requestData['shopUid'] !== request.shopUid
      ) {
        throw new Error(
          'Hindi eligible ang repair request na ito para sa rating.'
        );
      }

      const reviewReference = doc(
        db,
        'shopReviews',
        requestId
      );

      const existingReview = await getDoc(reviewReference);

      if (existingReview.exists()) {

        this.reviewedRequests[requestId] = true;

        throw new Error(
          'May naisumite ka nang review para sa repair request na ito.'
        );
      }

      const reviewData = {
        shopUid: requestData['shopUid'],
        requestId,
        customerUid: user.uid,
        customerName: requestData['customerName'] || '',
        rating,
        review,
        createdAt: serverTimestamp()
      };

      await setDoc(reviewReference, reviewData);

      this.reviewedRequests[requestId] = true;

      this.reviewSuccess[requestId] =
        'Matagumpay na naipadala ang iyong rating at review. Salamat sa iyong feedback!';

      this.reviewTexts[requestId] = '';
      this.ratingSelections[requestId] = 0;

    } catch (error: any) {

      console.error('Review submission error:', error);

      this.reviewErrors[requestId] =
        error.message ||
        'Hindi naipadala ang iyong review. Subukan ulit.';

    } finally {

      this.submittingReviews[requestId] = false;

      if (!this.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  // CONVERT FIRESTORE TIMESTAMP
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

    return 0;
  }

  // STATUS LABEL
  getStatusLabel(status: string): string {

    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  }

  // STATUS ICON
  getStatusIcon(status: string): string {

    switch (status) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'in-progress': return 'construct-outline';
      case 'completed': return 'checkmark-circle-outline';
      default: return 'document-text-outline';
    }
  }

  // BACK TO CUSTOMER DASHBOARD
  goToShops(): void {

    this.router.navigateByUrl('/home');
  }

  // REFRESH
  refreshRequests(): void {

    const user = auth.currentUser;

    if (user) {
      this.listenToCustomerRequests(user.uid);
    }
  }

  ngOnDestroy(): void {

    this.destroyed = true;

    this.authUnsubscribe?.();
    this.authUnsubscribe = null;

    this.requestsUnsubscribe?.();
    this.requestsUnsubscribe = null;
  }
}
