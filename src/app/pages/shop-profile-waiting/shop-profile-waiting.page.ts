import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  logOutOutline,
  refreshOutline
} from 'ionicons/icons';

import { signOut } from 'firebase/auth';

import {
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

import { auth, db } from '../../firebase';

@Component({
  selector: 'app-shop-profile-waiting',
  templateUrl: './shop-profile-waiting.page.html',
  styleUrls: ['./shop-profile-waiting.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class ShopProfileWaitingPage implements OnInit, OnDestroy {

  loading = true;
  shopName = 'Your Repair Shop';

  profileRejected = false;
  errorMessage = '';

  private unsubscribeShop?: () => void;

  constructor(private router: Router) {
    addIcons({
      timeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      logOutOutline,
      refreshOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });
      return;
    }

    try {
      // Verify the signed-in account.
      const userSnapshot = await getDoc(
        doc(db, 'users', currentUser.uid)
      );

      if (!userSnapshot.exists()) {
        await signOut(auth);
        await this.router.navigateByUrl('/login', {
          replaceUrl: true
        });
        return;
      }

      const userData = userSnapshot.data();

      if (
        userData['role'] !== 'shopOwner' ||
        userData['status'] !== 'approved'
      ) {
        await signOut(auth);
        await this.router.navigateByUrl('/login', {
          replaceUrl: true
        });
        return;
      }

      // Listen for real-time shop profile approval.
      const shopRef = doc(db, 'shops', currentUser.uid);

      this.unsubscribeShop = onSnapshot(
        shopRef,
        async snapshot => {
          if (!snapshot.exists()) {
            this.unsubscribeShop?.();

            await this.router.navigateByUrl(
              '/shop-profile-setup',
              { replaceUrl: true }
            );

            return;
          }

          const shopData = snapshot.data();

          this.shopName =
            shopData['shopName'] || 'Your Repair Shop';

          const status = shopData['profileStatus'];

          if (status === 'approved') {
            this.loading = false;
            this.profileRejected = false;

            this.unsubscribeShop?.();

            await this.router.navigateByUrl(
              '/shop-dashboard',
              { replaceUrl: true }
            );

            return;
          }

          if (status === 'rejected') {
            this.loading = false;
            this.profileRejected = true;
            return;
          }

          if (status === 'pending') {
            this.loading = false;
            this.profileRejected = false;
            this.errorMessage = '';
            return;
          }

          this.loading = false;
          this.errorMessage =
            'Your shop profile status could not be verified. Please contact the administrator.';
        },
        error => {
          console.error(
            'Shop profile waiting listener error:',
            error
          );

          this.loading = false;
          this.errorMessage =
            'Unable to check your shop profile status. Please check your internet connection.';
        }
      );

    } catch (error) {
      console.error(
        'Shop profile waiting page error:',
        error
      );

      this.loading = false;
      this.errorMessage =
        'Unable to load your shop profile. Please try again.';
    }
  }

  async refreshStatus(): Promise<void> {
    this.errorMessage = '';

    const currentUser = auth.currentUser;

    if (!currentUser) {
      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });
      return;
    }

    try {
      const shopSnapshot = await getDoc(
        doc(db, 'shops', currentUser.uid)
      );

      if (!shopSnapshot.exists()) {
        await this.router.navigateByUrl(
          '/shop-profile-setup',
          { replaceUrl: true }
        );
        return;
      }

      const status = shopSnapshot.data()['profileStatus'];

      if (status === 'approved') {
        await this.router.navigateByUrl(
          '/shop-dashboard',
          { replaceUrl: true }
        );
      } else if (status === 'rejected') {
        this.profileRejected = true;
      } else if (status === 'pending') {
        this.profileRejected = false;
      }

    } catch (error) {
      console.error('Refresh profile status error:', error);

      this.errorMessage =
        'Unable to refresh your profile status. Please try again.';
    }
  }

  async logout(): Promise<void> {
    try {
      this.unsubscribeShop?.();

      await signOut(auth);

      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });

    } catch (error) {
      console.error('Waiting page logout error:', error);

      this.errorMessage =
        'Unable to log out. Please try again.';
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeShop?.();
  }
}