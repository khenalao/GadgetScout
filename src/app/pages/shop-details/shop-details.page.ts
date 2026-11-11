
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  storefrontOutline,
  locationOutline,
  callOutline,
  mailOutline,
  constructOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  sendOutline,
  documentTextOutline,
  star,
  starOutline
} from 'ionicons/icons';

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

import { auth, db } from '../../firebase';

interface ShopDetails {
  uid?: string;
  ownerUid?: string;
  shopName?: string;
  ownerName?: string;
  email?: string;
  contactNumber?: string;
  address?: string;
  category?: string;
  description?: string;
  services?: string[];
  profileStatus?: string;
  subscriptionStatus?: string;
}

interface ShopReview {
  id: string;
  shopUid: string;
  requestId: string;
  customerUid: string;
  customerName: string;
  rating: number;
  review: string;
  createdAt: any;
}

@Component({
  selector: 'app-shop-details',
  templateUrl: './shop-details.page.html',
  styleUrls: ['./shop-details.page.scss'],
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
    IonSpinner
  ]
})
export class ShopDetailsPage implements OnInit, OnDestroy {

  shop: ShopDetails | null = null;

  customerName = '';
  customerContact = '';

  serviceName = '';

  // APPOINTMENT SCHEDULING
  appointmentDate = '';
  appointmentTime = '';
  minAppointmentDate = this.getLocalDateString();

  gadgetType = '';
  gadgetBrand = '';
  gadgetModel = '';
  issueDescription = '';

  isLoading = true;
  isSubmitting = false;

  errorMessage = '';
  successMessage = '';

  // RATINGS AND REVIEWS

  reviews: ShopReview[] = [];

  averageRating = 0;
  totalReviews = 0;

  isReviewsLoading = true;
  reviewsError = '';

  private reviewsUnsubscribe: Unsubscribe | null = null;

  private destroyed = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      arrowBackOutline,
      storefrontOutline,
      locationOutline,
      callOutline,
      mailOutline,
      constructOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      sendOutline,
      documentTextOutline,
      star,
      starOutline
    });
  }

  ngOnInit(): void {

    const navigationShop =
      history.state?.shop as ShopDetails | undefined;

    if (navigationShop) {

      this.shop = {
        ...navigationShop,
        services: navigationShop.services || []
      };

      this.isLoading = false;

      this.loadShopReviews();

    } else {

      this.errorMessage =
        'Hindi makita ang shop information. Bumalik sa Shops Directory at piliin ulit ang shop.';

      this.isLoading = false;
      this.isReviewsLoading = false;
    }

    // Refresh the minimum date when the page opens.
    this.minAppointmentDate = this.getLocalDateString();

    this.loadCustomerInformation();
  }

  // GET LOCAL DATE IN YYYY-MM-DD FORMAT

  private getLocalDateString(): string {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // VALIDATE APPOINTMENT DATE

  private isValidAppointmentDate(dateValue: string): boolean {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return false;
    }

    const [year, month, day] = dateValue.split('-').map(Number);

    const parsedDate = new Date(year, month - 1, day);

    const isRealDate =
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day;

    return isRealDate && dateValue >= this.getLocalDateString();
  }

  // VALIDATE APPOINTMENT TIME

  private isValidAppointmentTime(timeValue: string): boolean {

    return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue);
  }

  // LOAD CUSTOMER INFORMATION

  private async loadCustomerInformation(): Promise<void> {

    const user = auth.currentUser;

    if (!user) return;

    try {

      const userSnapshot = await getDoc(
        doc(db, 'users', user.uid)
      );

      if (!userSnapshot.exists()) return;

      const userData = userSnapshot.data();

      this.customerName =
        userData['fullName'] ||
        userData['name'] ||
        userData['ownerName'] ||
        '';

      this.customerContact =
        userData['contactNumber'] ||
        userData['phone'] ||
        '';

    } catch (error) {

      console.error(
        'Unable to load customer information:',
        error
      );
    }
  }

  // LOAD SHOP REVIEWS IN REAL TIME

  private loadShopReviews(): void {

    if (!this.shop) {
      this.isReviewsLoading = false;
      return;
    }

    const shopUid = this.shop.ownerUid || this.shop.uid;

    if (!shopUid) {

      this.isReviewsLoading = false;

      this.reviewsError =
        'Hindi makita ang shop ID para ma-load ang reviews.';

      return;
    }

    this.isReviewsLoading = true;
    this.reviewsError = '';

    this.reviewsUnsubscribe?.();

    const reviewsQuery = query(
      collection(db, 'shopReviews'),
      where('shopUid', '==', shopUid)
    );

    this.reviewsUnsubscribe = onSnapshot(

      reviewsQuery,

      (snapshot) => {

        if (this.destroyed) return;

        this.reviews = snapshot.docs.map((reviewDocument) => {

          const data = reviewDocument.data();

          return {
            id: reviewDocument.id,
            shopUid: data['shopUid'] || '',
            requestId: data['requestId'] || reviewDocument.id,
            customerUid: data['customerUid'] || '',
            customerName: data['customerName'] || 'Customer',
            rating: Number(data['rating']) || 0,
            review: data['review'] || '',
            createdAt: data['createdAt'] || null
          };
        });

        // SORT NEWEST REVIEWS FIRST

        this.reviews.sort(
          (a, b) =>
            this.getTimestampValue(b.createdAt) -
            this.getTimestampValue(a.createdAt)
        );

        // CALCULATE AVERAGE RATING

        this.totalReviews = this.reviews.length;

        if (this.totalReviews > 0) {

          const totalRating = this.reviews.reduce(
            (total, item) => total + item.rating,
            0
          );

          this.averageRating =
            Math.round(
              (totalRating / this.totalReviews) * 10
            ) / 10;

        } else {

          this.averageRating = 0;
        }

        this.isReviewsLoading = false;

        this.cdr.detectChanges();
      },

      (error) => {

        console.error(
          'Shop reviews loading error:',
          error
        );

        if (this.destroyed) return;

        this.reviewsError =
          'Hindi ma-load ang customer reviews. Tingnan kung tama at published na ang Firestore Rules.';

        this.isReviewsLoading = false;

        this.cdr.detectChanges();
      }
    );
  }

  // GET STAR ARRAY FOR REVIEW DISPLAY

  getReviewStars(rating: number): number[] {

    return [1, 2, 3, 4, 5].map(
      (starNumber) =>
        starNumber <= rating ? 1 : 0
    );
  }

  // CONVERT FIRESTORE TIMESTAMP

  getTimestampValue(value: any): number {

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

  // RETURN TO SHOPS DIRECTORY

  goBack(): void {

    this.router.navigateByUrl('/shops');
  }

  // SUBMIT REPAIR REQUEST

  async submitRepairRequest(): Promise<void> {

    this.errorMessage = '';
    this.successMessage = '';

    const user = auth.currentUser;

    if (!user) {

      this.errorMessage =
        'Kailangan mong mag-login bago makapag-submit ng repair request.';

      return;
    }

    if (!this.shop) {

      this.errorMessage =
        'Hindi makita ang napiling repair shop.';

      return;
    }

    if (this.isSubmitting) return;

    const customerName = this.customerName.trim();
    const customerContact = this.customerContact.trim();
    const selectedService = this.serviceName.trim();

    const appointmentDate = this.appointmentDate.trim();
    const appointmentTime = this.appointmentTime.trim();

    const gadgetType = this.gadgetType.trim();
    const gadgetBrand = this.gadgetBrand.trim();
    const gadgetModel = this.gadgetModel.trim();
    const issueDescription = this.issueDescription.trim();

    if (customerName.length < 2 || customerName.length > 100) {

      this.errorMessage =
        'Ilagay ang iyong pangalan (2 hanggang 100 characters).';

      return;
    }

    if (customerContact.length < 7 || customerContact.length > 30) {

      this.errorMessage =
        'Ilagay ang valid contact number (7 hanggang 30 characters).';

      return;
    }

    if (!selectedService) {

      this.errorMessage =
        'Pumili ng repair service.';

      return;
    }

    // VALIDATE APPOINTMENT DATE

    if (!appointmentDate) {

      this.errorMessage =
        'Pumili ng preferred appointment date.';

      return;
    }

    if (!this.isValidAppointmentDate(appointmentDate)) {

      this.errorMessage =
        'Pumili ng valid appointment date. Hindi maaaring pumili ng nakaraang petsa.';

      return;
    }

    // VALIDATE APPOINTMENT TIME

    if (!appointmentTime) {

      this.errorMessage =
        'Pumili ng preferred appointment time.';

      return;
    }

    if (!this.isValidAppointmentTime(appointmentTime)) {

      this.errorMessage =
        'Pumili ng valid appointment time.';

      return;
    }

    if (gadgetType.length < 2 || gadgetType.length > 60) {

      this.errorMessage =
        'Ilagay ang gadget type (2 hanggang 60 characters).';

      return;
    }

    if (gadgetBrand.length > 60 || gadgetModel.length > 60) {

      this.errorMessage =
        'Ang gadget brand at model ay hanggang 60 characters lamang.';

      return;
    }

    if (
      issueDescription.length < 10 ||
      issueDescription.length > 1000
    ) {

      this.errorMessage =
        'Ilarawan ang problema ng gadget (10 hanggang 1,000 characters).';

      return;
    }

    this.isSubmitting = true;

    try {

      // VERIFY ACTIVE CUSTOMER

      const customerSnapshot = await getDoc(
        doc(db, 'users', user.uid)
      );

      if (!customerSnapshot.exists()) {
        throw new Error('Hindi makita ang iyong user account.');
      }

      const customerData = customerSnapshot.data();

      if (
        customerData['role'] !== 'customer' ||
        customerData['status'] !== 'active'
      ) {
        throw new Error(
          'Active customer account lamang ang maaaring mag-submit ng repair request.'
        );
      }

      const shopUid = this.shop.ownerUid || this.shop.uid;

      if (!shopUid) {
        throw new Error('Hindi makita ang shop owner ID.');
      }

      // VERIFY SHOP STATUS

      const shopSnapshot = await getDoc(
        doc(db, 'shops', shopUid)
      );

      if (!shopSnapshot.exists()) {
        throw new Error('Hindi na available ang repair shop na ito.');
      }

      const shopData = shopSnapshot.data();

      if (
        shopData['ownerUid'] !== shopUid ||
        shopData['profileStatus'] !== 'approved' ||
        shopData['subscriptionStatus'] !== 'active'
      ) {
        throw new Error(
          'Hindi muna tumatanggap ng repair requests ang shop na ito.'
        );
      }

      // SAVE REQUEST AND PREFERRED APPOINTMENT SCHEDULE

      const requestData = {

        shopUid,

        shopName:
          shopData['shopName'] ||
          this.shop.shopName ||
          '',

        customerUid: user.uid,

        customerName,

        customerEmail: user.email || '',

        customerContact,

        serviceName: selectedService,

        appointmentDate,

        appointmentTime,

        gadgetType,

        gadgetBrand,

        gadgetModel,

        issueDescription,

        status: 'pending',

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()
      };

      await addDoc(
        collection(db, 'repairRequests'),
        requestData
      );

      this.successMessage =
        'Matagumpay na naipadala ang iyong repair request kasama ang preferred appointment schedule. Hintayin ang confirmation ng shop owner sa My Requests.';

      // CLEAR SUBMITTED FORM FIELDS

      this.serviceName = '';
      this.appointmentDate = '';
      this.appointmentTime = '';
      this.gadgetType = '';
      this.gadgetBrand = '';
      this.gadgetModel = '';
      this.issueDescription = '';

    } catch (error: any) {

      console.error(
        'Repair request submission error:',
        error
      );

      this.errorMessage =
        error.message ||
        'Hindi naipadala ang repair request. Subukan ulit.';

    } finally {

      this.isSubmitting = false;
    }
  }

  // OPEN CUSTOMER REQUESTS

  openMyRequests(): void {

    this.router.navigateByUrl('/my-requests');
  }

  // CLEAN UP REAL-TIME LISTENER

  ngOnDestroy(): void {

    this.destroyed = true;

    this.reviewsUnsubscribe?.();
    this.reviewsUnsubscribe = null;
  }
}
