
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  phonePortraitOutline,
  laptopOutline,
  tabletPortraitOutline,
  desktopOutline
} from 'ionicons/icons';

interface RepairService {
  name: string;
  description: string;
  price: string;
  icon: string;
}

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBadge
  ]
})
export class Tab3Page {
  services: RepairService[] = [
    {
      name: 'Smartphone Repair',
      description: 'Screen, battery, charging, and software issues.',
      price: 'From ₱300',
      icon: 'phone-portrait-outline'
    },
    {
      name: 'Laptop Repair',
      description: 'Hardware diagnosis, keyboard, and software repair.',
      price: 'From ₱500',
      icon: 'laptop-outline'
    },
    {
      name: 'Tablet Repair',
      description: 'Tablet screen, battery, and charging problems.',
      price: 'From ₱400',
      icon: 'tablet-portrait-outline'
    },
    {
      name: 'Computer Repair',
      description: 'Computer troubleshooting and hardware maintenance.',
      price: 'From ₱500',
      icon: 'desktop-outline'
    }
  ];

  constructor() {
    addIcons({
      phonePortraitOutline,
      laptopOutline,
      tabletPortraitOutline,
      desktopOutline
    });
  }
}