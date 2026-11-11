
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton
} from '@ionic/angular';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

@Component({
  selector: 'app-shop-profile-setup',
  templateUrl: './shop-profile-setup.page.html',
  styleUrls: ['./shop-profile-setup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton
  ]
})
export class ShopProfileSetupPage {
  shopName = '';
  ownerName = '';
  contactNumber = '';
  email = '';
  address = '';
  category = '';
  description = '';
  services = '';

  loading = false;

  constructor(private router: Router) {
    this.loadOwnerInformation();
  }

  async loadOwnerInformation(): Promise<void> {
    const user = auth.currentUser;

    if (!user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    try {
      const userSnapshot = await getDoc(doc(db, 'users', user.uid));

      if (
        !userSnapshot.exists() ||
        userSnapshot.data()['role'] !== 'shopOwner'
      ) {
        await auth.signOut();
        await this.router.navigateByUrl('/login');
        return;
      }

      const userData = userSnapshot.data();

      // Shop Owner account must already be approved.
      if (userData['status'] !== 'approved') {
        await auth.signOut();
        alert('Your Shop Owner account is not yet approved.');
        await this.router.navigateByUrl('/login');
        return;
      }

      this.ownerName = userData['name'] || '';
      this.email = userData['email'] || user.email || '';

      const shopSnapshot = await getDoc(doc(db, 'shops', user.uid));

      if (shopSnapshot.exists()) {
        const shop = shopSnapshot.data();

        // If profile is already approved, proceed to dashboard.
        if (shop['profileStatus'] === 'approved') {
          await this.router.navigateByUrl('/shop-dashboard', {
            replaceUrl: true
          });
          return;
        }

        // If profile is pending, proceed to waiting page.
        if (shop['profileStatus'] === 'pending') {
          await this.router.navigateByUrl('/shop-profile-waiting', {
            replaceUrl: true
          });
          return;
        }

        this.shopName = shop['shopName'] || '';
        this.contactNumber = shop['contactNumber'] || '';
        this.address = shop['address'] || '';
        this.category = shop['category'] || '';
        this.description = shop['description'] || '';
        this.services = shop['services'] || '';
      }

    } catch (error) {
      console.error('Unable to load owner information:', error);
      alert('Unable to load your shop profile.');
    }
  }

  async submitProfile(): Promise<void> {
    if (this.loading) return;

    const user = auth.currentUser;

    if (!user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    if (
      !this.shopName.trim() ||
      !this.ownerName.trim() ||
      !this.contactNumber.trim() ||
      !this.address.trim() ||
      !this.category ||
      !this.description.trim() ||
      !this.services.trim()
    ) {
      alert('Please complete all required fields.');
      return;
    }

    this.loading = true;

    try {
      const userSnapshot = await getDoc(doc(db, 'users', user.uid));

      if (
        !userSnapshot.exists() ||
        userSnapshot.data()['role'] !== 'shopOwner' ||
        userSnapshot.data()['status'] !== 'approved'
      ) {
        throw new Error('Unauthorized or unapproved account.');
      }

      await setDoc(
        doc(db, 'shops', user.uid),
        {
          ownerUid: user.uid,
          ownerName: this.ownerName.trim(),
          email: this.email,
          shopName: this.shopName.trim(),
          contactNumber: this.contactNumber.trim(),
          address: this.address.trim(),
          category: this.category,
          description: this.description.trim(),
          services: this.services.trim(),

          profileStatus: 'pending',
          publicationStatus: 'not_submitted',
          subscriptionStatus: 'inactive',

          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      alert(
        'Shop profile submitted successfully! Please wait for admin review.'
      );

      // Keep the Shop Owner signed in.
      // Navigate to the profile waiting page.
      await this.router.navigateByUrl('/shop-profile-waiting', {
        replaceUrl: true
      });

    } catch (error: any) {
      console.error('Shop profile submission error:', error);

      if (error.code === 'permission-denied') {
        alert(
          'Permission denied. Please check your Firestore security rules.'
        );
      } else {
        alert('Unable to submit your shop profile. Please try again.');
      }

    } finally {
      this.loading = false;
    }
  }

  async logout(): Promise<void> {
    await auth.signOut();
    await this.router.navigateByUrl('/login', {
      replaceUrl: true
    });
  }
}
