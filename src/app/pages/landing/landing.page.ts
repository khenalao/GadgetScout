import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  IonContent,
  IonIcon
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  constructOutline,
  searchOutline,
  shieldCheckmarkOutline,
  calendarOutline,
  documentTextOutline,
  chatbubbleEllipsesOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  storefrontOutline,
  phonePortraitOutline,
  laptopOutline,
  tabletPortraitOutline,
  starOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon
  ]
})
export class LandingPage {

  mobileMenuOpen = false;

  constructor(private router: Router) {
    addIcons({
      constructOutline,
      searchOutline,
      shieldCheckmarkOutline,
      calendarOutline,
      documentTextOutline,
      chatbubbleEllipsesOutline,
      arrowForwardOutline,
      checkmarkCircleOutline,
      storefrontOutline,
      phonePortraitOutline,
      laptopOutline,
      tabletPortraitOutline,
      starOutline
    });
  }

  getStarted(): void {
    this.mobileMenuOpen = false;
    this.router.navigateByUrl('/login');
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  scrollToSection(sectionId: string): void {
    this.mobileMenuOpen = false;

    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 50);
  }
}