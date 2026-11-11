
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon
} from '@ionic/angular';

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.page.html',
  styleUrls: ['./admin-login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    IonIcon
  ]
})
export class AdminLoginPage {
  email = '';
  password = '';

  errorMessage = '';
  resetMessage = '';

  isLoading = false;
  isResetting = false;

  constructor(private router: Router) {}

  async loginAdmin(): Promise<void> {
    if (this.isLoading) return;

    this.errorMessage = '';
    this.resetMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage =
        'Please enter your email and password.';
      return;
    }

    this.isLoading = true;

    let signedIn = false;

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        this.email.trim(),
        this.password
      );

      signedIn = true;

      const userSnapshot = await getDoc(
        doc(db, 'users', credential.user.uid)
      );

      if (
        !userSnapshot.exists() ||
        userSnapshot.data()['role'] !== 'admin'
      ) {
        await signOut(auth);
        signedIn = false;

        this.errorMessage =
          'Access denied. This account is not an administrator.';
        return;
      }

      await this.router.navigateByUrl('/admin-dashboard');

    } catch (error: any) {
      console.error('Admin login error:', error);

      if (signedIn) {
        await signOut(auth).catch(() => {});
      }

      if (error.code === 'auth/invalid-credential') {
        this.errorMessage =
          'Incorrect email or password.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage =
          'Please enter a valid email address.';
      } else if (
        error.code === 'permission-denied' ||
        error.code === 'firestore/permission-denied'
      ) {
        this.errorMessage =
          'Unable to verify administrator access. Check Firestore rules.';
      } else {
        this.errorMessage =
          'Unable to sign in. Please try again.';
      }

    } finally {
      this.isLoading = false;
    }
  }

  async resetAdminPassword(): Promise<void> {
    if (this.isResetting) return;

    this.errorMessage = '';
    this.resetMessage = '';

    const emailAddress = this.email.trim();

    if (!emailAddress) {
      this.errorMessage =
        'Please enter your registered email address first.';
      return;
    }

    this.isResetting = true;

    try {
      await sendPasswordResetEmail(
        auth,
        emailAddress
      );

      this.resetMessage =
        'If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.';

    } catch (error: any) {
      console.error('Password reset error:', error);

      this.errorMessage =
        'Unable to process the password reset request. Please try again.';

    } finally {
      this.isResetting = false;
    }
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
