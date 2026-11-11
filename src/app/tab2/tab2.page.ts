
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonLabel
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { locationOutline, callOutline, star } from 'ionicons/icons';

interface RepairShop {
  id: number;
  name: string;
  location: string;
  phone: string;
  rating: number;
  services: string[];
  address: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonLabel
  ]
})
export class Tab2Page {
  searchText = '';

  shops: RepairShop[] = [
    {
      id: 1,
      name: 'TechFix Gadget Repair',
      location: 'Naujan, Oriental Mindoro',
      address: 'Sample Address, Naujan, Oriental Mindoro',
      phone: '09123456789',
      rating: 4.5,
      services: ['Smartphone Repair', 'Screen Replacement']
    },
    {
      id: 2,
      name: 'LaptopCare Service Center',
      location: 'Calapan City, Oriental Mindoro',
      address: 'Sample Address, Calapan City, Oriental Mindoro',
      phone: '09987654321',
      rating: 4.7,
      services: ['Laptop Repair', 'Computer Repair']
    },
    {
      id: 3,
      name: 'QuickFix Electronics',
      location: 'Victoria, Oriental Mindoro',
      address: 'Sample Address, Victoria, Oriental Mindoro',
      phone: '09112223344',
      rating: 4.3,
      services: ['Tablet Repair', 'Smartphone Repair']
    }
  ];

  constructor() {
    addIcons({
      locationOutline,
      callOutline,
      star
    });
  }

  get filteredShops(): RepairShop[] {
    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      return this.shops;
    }

    return this.shops.filter(shop =>
      shop.name.toLowerCase().includes(query) ||
      shop.location.toLowerCase().includes(query) ||
      shop.services.some(service =>
        service.toLowerCase().includes(query)
      )
    );
  }

  openLocation(shop: RepairShop): void {
    const url =
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(shop.address);

    window.open(url, '_blank');
  }

  callShop(phone: string): void {
    window.location.href = `tel:${phone}`;
  }
}