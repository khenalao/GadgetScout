import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';

export const routes: Routes = [

  // Landing Page - Default Website Page
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full'
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./pages/landing/landing.page')
        .then(m => m.LandingPage)
  },

  // Authentication Pages
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page')
        .then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page')
        .then(m => m.RegisterPage)
  },

  // Admin Pages
  {
    path: 'admin-login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login.page')
        .then(m => m.AdminLoginPage)
  },
  {
    path: 'admin-dashboard',
    canActivate: [adminAuthGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.page')
        .then(m => m.AdminDashboardPage)
  },

  // Customer Pages
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page')
        .then(m => m.HomePage)
  },
  {
    path: 'shops',
    loadComponent: () =>
      import('./pages/shops/shops.page')
        .then(m => m.ShopsPage)
  },
  {
    path: 'shop-details',
    loadComponent: () =>
      import('./pages/shop-details/shop-details.page')
        .then(m => m.ShopDetailsPage)
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./pages/services/services.page')
        .then(m => m.ServicesPage)
  },
  {
    path: 'my-requests',
    loadComponent: () =>
      import('./pages/my-requests/my-requests.page')
        .then(m => m.MyRequestsPage)
  },

  // Shop Owner Pages
  {
    path: 'shop-profile-setup',
    loadComponent: () =>
      import('./pages/shop-profile-setup/shop-profile-setup.page')
        .then(m => m.ShopProfileSetupPage)
  },
  {
    path: 'shop-profile-waiting',
    loadComponent: () =>
      import('./pages/shop-profile-waiting/shop-profile-waiting.page')
        .then(m => m.ShopProfileWaitingPage)
  },
  {
    path: 'shop-dashboard',
    loadComponent: () =>
      import('./pages/shop-dashboard/shop-dashboard.page')
        .then(m => m.ShopDashboardPage)
  },

  // Existing Tabs
  {
    path: 'tabs',
    loadChildren: () =>
      import('./tabs/tabs.routes')
        .then(m => m.routes)
  },

  // Unknown Routes
  {
    path: '**',
    redirectTo: 'landing'
  }

];