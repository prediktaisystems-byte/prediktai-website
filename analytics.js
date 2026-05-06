/**
 * ─────────────────────────────────────────────────────────────────
 *  PREDIKT AI — GA4 Analytics Layer
 *  File: analytics.js
 *  Tracking ID: G-3QQ5W2XE4Y
 *
 *  ARCHITECTURE
 *  ─────────────────────────────────────────────────────────────
 *  1. trackEvent()         — centralised gtag wrapper (all events flow here)
 *  2. identifyUser()       — set GA4 user_id after login (no PII exposed)
 *  3. Page-view helpers    — one function per logical "page" in the SPA
 *  4. Interaction helpers  — prediction, market, pro picks, auth, payment
 *
 *  DUPLICATE-FIRE PREVENTION
 *  ─────────────────────────────────────────────────────────────
 *  A lightweight debounce registry (_fired) blocks identical
 *  event+label combos within a 500ms window so re-renders
 *  cannot double-fire the same event.
 *
 *  USAGE (inline hook examples)
 *  ─────────────────────────────────────────────────────────────
 *  // Page view
 *  PrediktAnalytics.pageView('home');
 *
 *  // Prediction card rendered
 *  PrediktAnalytics.viewPrediction('Arsenal vs Chelsea', 'Over 2.5');
 *
 *  // User clicks "Learn why"
 *  PrediktAnalytics.clickPrediction('Arsenal vs Chelsea', 'Over 2.5');
 *
 *  // Pro Pick interacted
 *  PrediktAnalytics.clickProPick('Arsenal vs Chelsea');
 *
 *  // Market performance row viewed
 *  PrediktAnalytics.viewMarketPerformance('Over 2.5');
 *
 *  // After successful login
 *  PrediktAnalytics.trackLogin('premium');
 *  PrediktAnalytics.identifyUser('hashed_or_anon_id');
 *
 *  // After OTP verified → signup complete
 *  PrediktAnalytics.trackSignup('trial');
 *
 *  // Payment initiated
 *  PrediktAnalytics.initiateCheckout('PREMIUM', 3500, 'NGN');
 *
 *  // Payment success
 *  PrediktAnalytics.trackPurchase('PREMIUM', 3500, 'NGN');
 * ─────────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  /* ─── Config ──────────────────────────────────────────────────── */
  var GA_ID = 'G-3QQ5W2XE4Y';

  /* ─── Duplicate-fire guard ────────────────────────────────────── */
  var _fired     = {};
  var DEBOUNCE_MS = 500;

  function _dedupeKey(name, label) {
    return name + '||' + (label || '');
  }

  function _canFire(name, label) {
    var key  = _dedupeKey(name, label);
    var now  = Date.now();
    if (_fired[key] && (now - _fired[key]) < DEBOUNCE_MS) return false;
    _fired[key] = now;
    return true;
  }

  /* ─── Core gtag wrapper ───────────────────────────────────────── */
  /**
   * trackEvent — the single entry point for every GA4 event.
   *
   * @param {string} name     — GA4 event name  (e.g. 'view_prediction')
   * @param {string} category — event_category  (e.g. 'predictions')
   * @param {string} [label]  — event_label     (e.g. 'Arsenal vs Chelsea')
   * @param {Object} [extra]  — any additional GA4 parameters
   */
  function trackEvent(name, category, label, extra) {
    if (typeof gtag !== 'function') return;
    if (!_canFire(name, label)) return;

    var payload = { event_category: category };
    if (label  !== undefined && label  !== null) payload.event_label = label;
    if (extra  && typeof extra === 'object') {
      Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    }

    gtag('event', name, payload);
  }

  /* ─── User identity (post-login) ─────────────────────────────── */
  /**
   * identifyUser — sets GA4 user_id dimension.
   * Pass a hashed / anonymous ID only. NEVER pass raw email.
   *
   * @param {string} anonymousId  — e.g. a hashed email or internal UUID
   * @param {string} [planType]   — 'trial' | 'premium' | 'pro'
   */
  function identifyUser(anonymousId, planType) {
    if (typeof gtag !== 'function' || !anonymousId) return;
    var config = { user_id: anonymousId };
    if (planType) config.user_properties = { plan_type: planType.toLowerCase() };
    gtag('config', GA_ID, config);
  }

  /* ─── Page views (SPA virtual screens) ───────────────────────── */
  /**
   * pageView — fires a virtual page_view for each SPA "page".
   * Called inside togglePage() so every tab switch is captured.
   *
   * @param {string} pageName — matches the page ID ('home','results', etc.)
   */
  function pageView(pageName) {
    if (typeof gtag !== 'function') return;
    var titles = {
      home:      'Home — Today\'s Predictions',
      propicks:  'Pro Picks',
      results:   'Results & Performance',
      pricing:   'Pricing',
      profile:   'Profile',
      about:     'About Us'
    };
    gtag('event', 'page_view', {
      page_title:    titles[pageName] || pageName,
      page_location: window.location.href,
      page_path:     '/#' + pageName
    });
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION A — Predictions                                        *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * viewPrediction — fired once per match card when predictions load.
   * @param {string} matchName  — e.g. 'Arsenal vs Chelsea'
   * @param {string} [topMarket] — top-ranked market for this match
   */
  function viewPrediction(matchName, topMarket) {
    trackEvent('view_prediction', 'predictions', matchName, {
      market_name: topMarket || ''
    });
  }

  /**
   * clickPrediction — fired when user expands "Learn why" or interacts
   * with a specific market pick.
   * @param {string} matchName
   * @param {string} marketName — e.g. 'Over 2.5'
   */
  function clickPrediction(matchName, marketName) {
    trackEvent('click_prediction', 'predictions', matchName, {
      market_name: marketName || ''
    });
  }

  /**
   * switchMarketTab — fired when user switches between Value / Main market tabs.
   * @param {string} matchName
   * @param {string} tabType — 'value' | 'main'
   */
  function switchMarketTab(matchName, tabType) {
    trackEvent('switch_market_tab', 'predictions', matchName, {
      tab_type: tabType
    });
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION B — Results page                                       *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * viewResults — fired when user opens the Results tab.
   */
  function viewResults() {
    trackEvent('view_results', 'performance', 'results_page');
  }

  /**
   * viewResultsDay — fired when user taps a specific day in the day strip.
   * @param {string} dayKey — 'YYYY-MM-DD'
   */
  function viewResultsDay(dayKey) {
    trackEvent('view_results_day', 'performance', dayKey);
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION C — Market Performance modal                           *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * viewMarketPerformance — fired when the Market Performance modal opens.
   * Also fired when user drills into a specific market row.
   * @param {string} [marketName] — e.g. 'Over 2.5'; omit for modal open
   */
  function viewMarketPerformance(marketName) {
    var label = marketName || 'modal_open';
    trackEvent('view_market_performance', 'market_stats', label);
  }

  /**
   * switchMarketPerfTab — fired when user toggles Value ↔ Main in the
   * Market Performance modal.
   * @param {string} tabName — 'value' | 'main'
   */
  function switchMarketPerfTab(tabName) {
    trackEvent('switch_market_perf_tab', 'market_stats', tabName);
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION D — Pro Picks                                          *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * viewProPicksPage — fired when Pro Picks tab is opened.
   */
  function viewProPicksPage() {
    trackEvent('view_pro_picks_page', 'pro_picks', 'pro_picks_tab');
  }

  /**
   * clickProPick — fired when user interacts with a Pro Pick card
   * (e.g. clicks "Learn why" or taps the card).
   * @param {string} matchName
   * @param {string} [marketName]
   */
  function clickProPick(matchName, marketName) {
    trackEvent('click_pro_pick', 'pro_picks', matchName, {
      market_name: marketName || ''
    });
  }

  /**
   * viewProPicksResults — fired when user opens the Pro Picks
   * performance / history panel.
   */
  function viewProPicksResults() {
    trackEvent('view_pro_picks_results', 'pro_picks', 'performance_panel');
  }

  /**
   * viewProPicksDay — fired when user taps a day in the Pro Picks
   * results day strip.
   * @param {string} dayKey — 'YYYY-MM-DD'
   */
  function viewProPicksDay(dayKey) {
    trackEvent('view_pro_picks_day', 'pro_picks', dayKey);
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION E — Auth                                               *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * trackLogin — fired on successful login (before page reload).
   * @param {string} planType — user's current plan
   */
  function trackLogin(planType) {
    trackEvent('login', 'auth', planType || 'unknown');
  }

  /**
   * trackSignupStart — fired when signup modal is first opened.
   */
  function trackSignupStart() {
    trackEvent('signup_start', 'auth', 'modal_open');
  }

  /**
   * trackSignup — fired after OTP verified → account fully created.
   * @param {string} planType — always 'trial' on first signup
   */
  function trackSignup(planType) {
    trackEvent('signup', 'auth', planType || 'trial');
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  SECTION F — Payments / Upgrades                                *
   * ─────────────────────────────────────────────────────────────── */

  /**
   * initiateCheckout — fired when Flutterwave modal opens.
   * @param {string} plan     — 'PREMIUM' | 'PRO'
   * @param {number} amount
   * @param {string} currency
   */
  function initiateCheckout(plan, amount, currency) {
    trackEvent('begin_checkout', 'payments', plan, {
      currency: currency,
      value:    amount
    });
  }

  /**
   * trackPurchase — fired on Flutterwave success callback.
   * @param {string} plan
   * @param {number} amount
   * @param {string} currency
   */
  function trackPurchase(plan, amount, currency) {
    if (typeof gtag !== 'function') return;
    // Use GA4's standard purchase event for revenue tracking
    gtag('event', 'purchase', {
      transaction_id: 'PREDIKT_' + Date.now(),
      value:          amount,
      currency:       currency,
      items: [{
        item_id:   plan.toLowerCase(),
        item_name: plan === 'PRO' ? 'Pro Picks Plan' : 'Premium Plan',
        price:     amount,
        quantity:  1
      }]
    });
  }

  /**
   * clickUpgrade — fired when user taps an upgrade CTA (before payment modal).
   * @param {string} plan
   * @param {string} source — where the CTA was clicked (e.g. 'pricing_page', 'profile')
   */
  function clickUpgrade(plan, source) {
    trackEvent('click_upgrade', 'payments', plan, { cta_source: source || '' });
  }

  /* ─────────────────────────────────────────────────────────────── *
   *  Public API                                                     *
   * ─────────────────────────────────────────────────────────────── */
  window.PrediktAnalytics = {
    /* core */
    trackEvent:            trackEvent,
    identifyUser:          identifyUser,
    pageView:              pageView,

    /* predictions */
    viewPrediction:        viewPrediction,
    clickPrediction:       clickPrediction,
    switchMarketTab:       switchMarketTab,

    /* results */
    viewResults:           viewResults,
    viewResultsDay:        viewResultsDay,

    /* market performance */
    viewMarketPerformance: viewMarketPerformance,
    switchMarketPerfTab:   switchMarketPerfTab,

    /* pro picks */
    viewProPicksPage:      viewProPicksPage,
    clickProPick:          clickProPick,
    viewProPicksResults:   viewProPicksResults,
    viewProPicksDay:       viewProPicksDay,

    /* auth */
    trackLogin:            trackLogin,
    trackSignupStart:      trackSignupStart,
    trackSignup:           trackSignup,

    /* payments */
    initiateCheckout:      initiateCheckout,
    trackPurchase:         trackPurchase,
    clickUpgrade:          clickUpgrade
  };

}(window));
