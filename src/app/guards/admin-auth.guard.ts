
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';

export const adminAuthGuard: CanActivateFn = async () => {
  const router = inject(Router);

  try {
    // Wait for Firebase to restore the authentication session
    await auth.authStateReady();

    const currentUser = auth.currentUser;

    // Redirect if no authenticated user
    if (!currentUser) {
      return router.createUrlTree(['/admin-login']);
    }

    // Check the user's role in Firestore
    const userSnapshot = await getDoc(
      doc(db, 'users', currentUser.uid)
    );

    if (
      !userSnapshot.exists() ||
      userSnapshot.data()['role'] !== 'admin'
    ) {
      return router.createUrlTree(['/admin-login']);
    }

    console.log(
      'Admin authentication verified:',
      currentUser.uid
    );

    return true;

  } catch (error) {
    console.error('Admin authentication guard error:', error);

    return router.createUrlTree(['/admin-login']);
  }
};
