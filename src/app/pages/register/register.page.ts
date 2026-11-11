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
  arrowBackOutline,
  personOutline,
  storefrontOutline,
  mailOutline,
  informationCircleOutline,
  arrowForwardOutline
} from 'ionicons/icons';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../../firebase';

type AccountRole = 'customer' | 'shopOwner';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon
  ]
})
export class RegisterPage {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  role: AccountRole = 'customer';

  acceptedTerms = false;
  loading = false;

  constructor(private router: Router) {
    addIcons({
      constructOutline,
      shieldCheckmarkOutline,
      searchOutline,
      documentTextOutline,
      notificationsOutline,
      arrowBackOutline,
      personOutline,
      storefrontOutline,
      mailOutline,
      informationCircleOutline,
      arrowForwardOutline
    });
  }

  selectRole(role: AccountRole): void {
    this.role = role;
  }

  async register(): Promise<void> {
    // Prevent duplicate submissions.
    if (this.loading) {
      return;
    }

    // Validate required fields.
    if (
      !this.fullName.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      alert('Please complete all fields.');
      return;
    }

    // Validate email format.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(this.email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }

    // Firebase Authentication requires at least 6 characters
    // by default. This application requires at least 8.
    if (this.password.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (!this.acceptedTerms) {
      alert('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    this.loading = true;

    try {
      // Create the Firebase Authentication account.
      const credential = await createUserWithEmailAndPassword(
        auth,
        this.email.trim(),
        this.password
      );

      // Create the user's Firestore profile.
      await setDoc(
        doc(db, 'users', credential.user.uid),
        {
          uid: credential.user.uid,
          name: this.fullName.trim(),
          email: this.email.trim(),
          role: this.role,

          // Shop owners must be approved by an administrator.
          // Customers can use the application after registration.
          status: this.role === 'shopOwner' ? 'pending' : 'active',

          createdAt: serverTimestamp()
        }
      );

      if (this.role === 'shopOwner') {
        alert(
          'Registration successful! Your shop owner account is pending admin approval. You can log in after your account is approved.'
        );
      } else {
        alert(
          'Customer registration successful! You can now log in.'
        );
      }

      // Return to the login page after successful registration.
      await this.router.navigateByUrl('/login');

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered.');

      } else if (error.code === 'auth/invalid-email') {
        alert('Please enter a valid email address.');

      } else if (error.code === 'auth/weak-password') {
        alert('Your password is too weak. Please use a stronger password.');

      } else if (
        error.code === 'permission-denied' ||
        error.code === 'firestore/permission-denied'
      ) {
        alert(
          'Unable to save your account profile. Please check your Firestore security rules.'
        );

      } else {
        alert(
          'Registration failed. Please check your connection and try again.'
        );
      }

    } finally {
      this.loading = false;
    }
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  goToHome(): void {
    // Return to the login page because the application
    // requires users to sign in before accessing the home page.
    this.router.navigateByUrl('/login');
  }

  showTerms(): void {
    alert(
      'Terms of Service: Please contact the GadgetScout administrator for the official terms.'
    );
  }

  showPrivacy(): void {
    alert(
      'Privacy Policy: Please contact the GadgetScout administrator for the official privacy policy.'
    );
  }
}