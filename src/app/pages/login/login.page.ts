import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  constructOutline,
  shieldCheckmarkOutline,
  searchOutline,
  documentTextOutline,
  notificationsOutline,
  mailOutline,
  arrowForwardOutline,
  arrowBackOutline,
  storefrontOutline
} from 'ionicons/icons';

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ]
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;

  constructor(private router: Router) {
    addIcons({
      constructOutline,
      shieldCheckmarkOutline,
      searchOutline,
      documentTextOutline,
      notificationsOutline,
      mailOutline,
      arrowForwardOutline,
      arrowBackOutline,
      storefrontOutline
    });
  }

  async login(): Promise<void> {
    if (this.loading) return;

    if (!this.email.trim() || !this.password) {
      alert('Please enter your email and password.');
      return;
    }

    this.loading = true;

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        this.email.trim(),
        this.password
      );

      const uid = credential.user.uid;

      // GET USER ACCOUNT INFORMATION
      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await signOut(auth);

        alert(
          'Account profile not found. Please contact the administrator.'
        );
        return;
      }

      const userData = userSnapshot.data();
      const role = userData['role'];
      const status = userData['status'];

      // SHOP OWNER LOGIN
      if (role === 'shopOwner') {

        // ACCOUNT PENDING
        if (status === 'pending') {
          await signOut(auth);

          alert(
            'Your shop owner account is still pending admin approval.'
          );
          return;
        }

        // ACCOUNT REJECTED
        if (status === 'rejected') {
          await signOut(auth);

          alert(
            'Your shop owner application was rejected. Please contact the administrator.'
          );
          return;
        }

        // ACCOUNT NOT APPROVED
        if (status !== 'approved') {
          await signOut(auth);

          alert(
            'Your account has not been approved yet.'
          );
          return;
        }

        // CHECK SHOP PROFILE
        const shopRef = doc(db, 'shops', uid);
        const shopSnapshot = await getDoc(shopRef);

        // NO SHOP PROFILE YET
        if (!shopSnapshot.exists()) {
          await this.router.navigateByUrl(
            '/shop-profile-setup',
            { replaceUrl: true }
          );
          return;
        }

        const shopData = shopSnapshot.data();
        const profileStatus = shopData['profileStatus'];

        // SHOP PROFILE PENDING
        // Keep the owner signed in.
        if (profileStatus === 'pending') {
          await this.router.navigateByUrl(
            '/shop-profile-waiting',
            { replaceUrl: true }
          );
          return;
        }

        // SHOP PROFILE REJECTED
        if (profileStatus === 'rejected') {
          await signOut(auth);

          alert(
            'Your shop profile was rejected. Please contact the administrator.'
          );
          return;
        }

        // SHOP PROFILE APPROVED
        if (profileStatus === 'approved') {
          await this.router.navigateByUrl(
            '/shop-dashboard',
            { replaceUrl: true }
          );
          return;
        }

        // UNKNOWN PROFILE STATUS
        await signOut(auth);

        alert(
          'Your shop profile status is not yet verified. Please contact the administrator.'
        );
        return;
      }

      // CUSTOMER LOGIN
      if (role === 'customer') {
        await this.router.navigateByUrl(
          '/home',
          { replaceUrl: true }
        );
        return;
      }

      // INVALID ROLE
      await signOut(auth);

      alert(
        'Invalid account role. Please contact the administrator.'
      );

    } catch (error: any) {
      console.error('Login error:', error);

      if (error.code === 'auth/invalid-credential') {
        alert('Incorrect email or password.');
      } else if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        alert('Too many attempts. Please try again later.');
      } else if (
        error.code === 'permission-denied' ||
        error.code === 'firestore/permission-denied'
      ) {
        alert(
          'Unable to access your account profile. Please check your Firestore permissions.'
        );
      } else {
        alert(
          'Login failed. Please check your connection and try again.'
        );
      }

    } finally {
      this.loading = false;
    }
  }

  goToRegister(): void {
    this.router.navigateByUrl('/register');
  }

  goToHome(): void {
    this.router.navigateByUrl('/home');
  }

  focusEmail(): void {
    const emailInput =
      document.getElementById('email') as HTMLInputElement | null;

    emailInput?.focus();
  }

  async forgotPassword(): Promise<void> {
    const emailAddress = this.email.trim();

    if (!emailAddress) {
      alert('Please enter your email address first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailAddress);

      alert(
        'If an account exists for this email, a password reset email will be sent.'
      );

    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address.');
      } else {
        alert(
          'Unable to request a password reset. Please try again later.'
        );
      }
    }
  }
}