import { Component } from '@angular/core';
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
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonChip
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  constructOutline,
  logOutOutline,
  searchOutline,
  phonePortraitOutline,
  laptopOutline,
  tabletPortraitOutline,
  hardwareChipOutline,
  storefrontOutline,
  clipboardOutline,
  chevronForwardOutline,
  shieldCheckmarkOutline,
  menuOutline,
  closeOutline,
  homeOutline
} from 'ionicons/icons';

import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface ServiceCategory {
  name: string;
  description: string;
  icon: string;
  searchTerm: string;
}

type CustomerSection = 'home' | 'shops' | 'requests';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
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
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonChip
  ]
})
export class HomePage {

  searchText = '';
  isLoggingOut = false;

  // Sidebar controls
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;

  // Selected dashboard section
  activeSection: CustomerSection = 'home';

  categories: ServiceCategory[] = [
    {
      name: 'Smartphones',
      description: 'Phone repair services',
      icon: 'phone-portrait-outline',
      searchTerm: 'smartphone'
    },
    {
      name: 'Laptops',
      description: 'Laptop repair services',
      icon: 'laptop-outline',
      searchTerm: 'laptop'
    },
    {
      name: 'Tablets',
      description: 'Tablet repair services',
      icon: 'tablet-portrait-outline',
      searchTerm: 'tablet'
    },
    {
      name: 'Other Gadgets',
      description: 'Other device repairs',
      icon: 'hardware-chip-outline',
      searchTerm: 'other'
    }
  ];

  constructor(private router: Router) {

    addIcons({
      constructOutline,
      logOutOutline,
      searchOutline,
      phonePortraitOutline,
      laptopOutline,
      tabletPortraitOutline,
      hardwareChipOutline,
      storefrontOutline,
      clipboardOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      menuOutline,
      closeOutline,
      homeOutline
    });

  }

  // DESKTOP SIDEBAR
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // MOBILE SIDEBAR
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }

  // CHANGE DASHBOARD SECTION
  selectSection(section: CustomerSection): void {
    this.activeSection = section;

    // Close mobile sidebar after selecting a section
    this.closeMobileSidebar();
  }

  // FILTER CATEGORIES
  get filteredCategories(): ServiceCategory[] {

    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      return this.categories;
    }

    return this.categories.filter(category =>
      category.name.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      category.searchTerm.toLowerCase().includes(query)
    );

  }

  // FIND REPAIR SHOPS
  findShops(category?: ServiceCategory): void {

    const query = category?.searchTerm ?? this.searchText.trim();

    this.closeMobileSidebar();

    this.router.navigate(['/shops'], {
      queryParams: query ? { search: query } : {}
    });

  }

  // OPEN REPAIR REQUESTS PAGE
  openRequests(): void {

    this.closeMobileSidebar();

    this.router.navigateByUrl('/my-requests');

  }

  // LOGOUT
  async logout(): Promise<void> {

    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    try {

      await signOut(auth);

      await this.router.navigateByUrl('/login', {
        replaceUrl: true
      });

    } catch (error) {

      console.error('Logout failed:', error);

      alert('Hindi nakapag-logout. Pakisubukan ulit.');

    } finally {

      this.isLoggingOut = false;

    }

  }

}