/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

// update data
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';
    const res = await axios({
      method: 'PATCH',
      url,
      data,
      withCredentials: true
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
      window.setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};

// fetch and display reviews
export const loadUserReviews = async userId => {
  console.log('loadUserReviews called with userId:', userId);
  const reviewsList = document.getElementById('my-reviews-list');
  reviewsList.innerHTML =
    '<p class="loading-message" style="text-align: center; padding: 20px; color: #999;">Loading your reviews...</p>';

  try {
    console.log('Fetching reviews from: /api/v1/reviews/user/' + userId);
    const res = await axios({
      method: 'GET',
      url: `/api/v1/reviews/user/${userId}`,
      withCredentials: true
    });

    console.log('Reviews API response:', res.data);

    if (res.data.status === 'success' && res.data.data.data.length > 0) {
      console.log('Found ' + res.data.data.data.length + ' reviews');
      reviewsList.innerHTML = '';

      res.data.data.data.forEach(review => {
        const stars = [1, 2, 3, 4, 5]
          .map(
            star => `
            <svg class="reviews__star reviews__star--${
              review.rating >= star ? 'active' : 'inactive'
            }">
              <use xlink:href="/img/icons.svg#icon-star"></use>
            </svg>
          `
          )
          .join('');

        const tourName = review.tour ? review.tour.name : 'Tour not available';

        const reviewHTML = `
          <div class="reviews__card">
            <div class="reviews__avatar">
              <img class="reviews__avatar-img" src="/img/users/${
                review.user.photo
              }" alt="${review.user.name}">
              <h6 class="reviews__user">${review.user.name}</h6>
            </div>
            <p class="reviews__text">${review.review}</p>
            <p class="reviews__tour" style="margin-top: 10px; font-weight: 600; color: #55c57a;">Tour: ${tourName}</p>
            <div class="reviews__rating">
              ${stars}
            </div>
          </div>
        `;
        reviewsList.innerHTML += reviewHTML;
      });
    } else {
      console.log('No reviews found');
      reviewsList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <svg style="width: 60px; height: 60px; margin-bottom: 15px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <h3 style="margin: 0; color: #999; font-size: 18px;">No reviews yet</h3>
          <p style="margin: 5px 0 0 0; color: #bbb; font-size: 14px;">Write a review about a tour you've experienced</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading reviews:', err);
    console.error('Error response:', err.response.data);
    reviewsList.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <svg style="width: 60px; height: 60px; margin-bottom: 15px; color: #f55;">  
          <use xlink:href="/img/icons.svg#icon-alert"></use>
        </svg>
        <h3 style="margin: 0; color: #f55; font-size: 18px;">Error loading reviews</h3>
        <p style="margin: 5px 0 0 0; color: #999; font-size: 14px;">Please try again later</p>
      </div>
    `;
    showAlert('error', 'Error loading reviews');
  }
};

// tab switching
export const setupTabSwitching = userId => {
  console.log('setupTabSwitching called with userId:', userId);
  const navTabs = document.querySelectorAll('.nav-tab');
  const settingsSections = document.querySelectorAll('.settings-section');
  const reviewsContainer = document.getElementById('reviews-container');

  console.log('Found nav tabs:', navTabs.length);
  console.log('Found settings sections:', settingsSections.length);
  console.log('Reviews container found:', !!reviewsContainer);

  navTabs.forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();

      const tabName = tab.getAttribute('data-tab');
      console.log('Tab clicked:', tabName);

      // Update active nav item
      navTabs.forEach(t =>
        t.parentElement.classList.remove('side-nav--active')
      );
      tab.parentElement.classList.add('side-nav--active');

      // Show/hide content based on tab
      if (tabName === 'reviews') {
        console.log('Showing reviews tab');
        // Hide all settings sections
        settingsSections.forEach(section => {
          section.style.display = 'none';
        });
        // Show reviews
        reviewsContainer.style.display = 'block';
        loadUserReviews(userId);
      } else if (tabName === 'settings') {
        console.log('Showing settings tab');
        // Show all settings sections
        settingsSections.forEach(section => {
          section.style.display = 'block';
        });
        // Hide reviews
        reviewsContainer.style.display = 'none';
      }
    });
  });
};
