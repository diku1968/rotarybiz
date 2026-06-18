// Core Application Controller - Rotary Club Biz Hub
// Manages Views Routing, Forms, Interactive Charts, Exporting & UI state

let currentUser = null;
let activeTab = 'dashboard';

// Active chart instances (for cleanup on redraw)
let valueChartInstance = null;
let categoryChartInstance = null;
let referralChartInstance = null;

// Firebase Authentication Error Translator
function handleAuthError(err, prefix = "Error") {
    console.error(err);
    let msg = err.message;
    if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        msg = "Authentication provider (Email/Password or Phone) has not been enabled in your Firebase console.\n\nPlease go to Firebase Console -> Authentication -> Sign-in Method, and enable 'Email/Password' (and 'Phone' if using OTP).";
    }
    alert(prefix + ": " + msg);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupRouter();
    setupAuthListeners();
    setupMobileSidebar();
    populateCategoryDropdowns();
    setupSponsorFormListeners();
});

function setupSponsorFormListeners() {
    const modalEl = document.getElementById('adminAddSponsorModal');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', () => {
            const todayStr = new Date().toISOString().split('T')[0];
            document.getElementById('adminSponsorStartDate').value = todayStr;
            document.getElementById('adminSponsorEndDate').value = "";
            document.getElementById('adminSponsorDurationPreset').value = "";
        });
    }

    const presetSelect = document.getElementById('adminSponsorDurationPreset');
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const startInput = document.getElementById('adminSponsorStartDate');
            const endInput = document.getElementById('adminSponsorEndDate');
            if (!startInput.value) {
                startInput.value = new Date().toISOString().split('T')[0];
            }
            const startDate = new Date(startInput.value);
            if (isNaN(startDate.getTime())) return;

            const val = presetSelect.value;
            let endDate = new Date(startDate);
            if (val === '1m') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (val === '3m') {
                endDate.setMonth(endDate.getMonth() + 3);
            } else if (val === '1y') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            endInput.value = endDate.toISOString().split('T')[0];
        });
    }
}

// ----------------------------------------------------
// ROUTING ENGINE (SPA Hash Router)
// ----------------------------------------------------
function setupRouter() {
    const handleRoute = () => {
        const hash = window.location.hash || '#/dashboard';
        const route = hash.replace('#/', '');
        
        // Check authentication state
        currentUser = window.RotaryBizAuth.getCurrentUser();
        
        // Public routes block
        if (!currentUser && route !== 'login' && route !== 'register') {
            window.location.hash = '#/login';
            return;
        }
        
        if (currentUser && (route === 'login' || route === 'register')) {
            window.location.hash = '#/dashboard';
            return;
        }

        activeTab = route;
        updateActiveSidebarLink();
        renderActiveView();
    };

    window.addEventListener('hashchange', handleRoute);
    // Initial trigger
    handleRoute();
}

function updateActiveSidebarLink() {
    document.querySelectorAll('.nav-item-custom').forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#/${activeTab}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function renderActiveView() {
    // Hide all containers
    document.querySelectorAll('.tab-pane-custom').forEach(pane => {
        pane.classList.remove('active');
    });

    // Toggle main CRM frame wrapper depending on login state
    const appWrapper = document.getElementById('crmMainWrapper');
    const authWrapper = document.getElementById('authWrapper');
    
    if (activeTab === 'login' || activeTab === 'register') {
        appWrapper.style.display = 'none';
        authWrapper.style.display = 'flex';
        
        if (activeTab === 'login') {
            renderLoginView();
        } else {
            renderRegisterView();
        }
    } else {
        appWrapper.style.display = 'block';
        authWrapper.style.display = 'none';
        
        // Show specific dashboard screen pane
        const activePane = document.getElementById(`pane-${activeTab}`);
        if (activePane) {
            activePane.classList.add('active');
        }
        
        // Refresh view data
        switch (activeTab) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'directory':
                populateCategoryDropdowns().then(() => loadDirectoryData());
                break;
            case 'profile':
                populateCategoryDropdowns().then(() => loadProfileData());
                break;
            case 'requirements':
                populateCategoryDropdowns().then(() => loadRequirementsData());
                break;
            case 'referrals':
                loadReferralsData();
                break;
            case 'reports':
                loadReportsData();
                break;
            case 'admin':
                populateCategoryDropdowns().then(() => loadAdminData());
                break;
            case 'settings':
                loadSettingsView();
                break;
        }
    }
}

// Sidebar toggle for tablets/mobile
function setupMobileSidebar() {
    const hamburger = document.getElementById('hamburgerToggle');
    const sidebar = document.getElementById('sidebarMenu');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar on link clicks
        sidebar.querySelectorAll('.nav-item-custom').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });
    }
}

// ----------------------------------------------------
// AUTHENTICATION STATE & VIEWS
// ----------------------------------------------------
function setupAuthListeners() {
    window.RotaryBizAuth.onAuthStateChanged((user) => {
        currentUser = user;
        const navProfile = document.getElementById('headerUserProfile');
        
        if (currentUser) {
            const isAdmin = currentUser.email === 'dhirenpathak1970@gmail.com' || currentUser.role === 'admin';
            const adminLink = document.getElementById('adminSidebarLink');
            if (adminLink) {
                adminLink.style.display = isAdmin ? 'flex' : 'none';
            }
            if (navProfile) {
                navProfile.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <div class="text-end d-none d-sm-block">
                            <h6 class="mb-0 text-white">${currentUser.name} ${isAdmin ? '<span class="badge bg-danger ms-1 text-uppercase" style="font-size:0.65rem;">Admin</span>' : ''}</h6>
                            <small class="text-secondary">${currentUser.companyName}</small>
                        </div>
                        <div class="profile-logo-wrap" style="width:36px; height:36px; border-radius: 50%;">
                            <img src="${currentUser.logoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60'}" alt="User logo">
                        </div>
                    </div>
                `;
            }
            // If we are in login/register screens, bounce to dashboard
            const hash = window.location.hash;
            if (hash.includes('login') || hash.includes('register')) {
                window.location.hash = '#/dashboard';
            }
        } else {
            const adminLink = document.getElementById('adminSidebarLink');
            if (adminLink) adminLink.style.display = 'none';
            if (navProfile) navProfile.innerHTML = '';
            window.location.hash = '#/login';
        }
    });

    // Logout Click
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                await window.RotaryBizAuth.logout();
                window.location.hash = '#/login';
            }
        });
    }
}

function renderLoginView() {
    const authWrapper = document.getElementById('authWrapper');
    authWrapper.innerHTML = `
        <div class="auth-card glow-animation">
            <div class="text-center mb-4">
                <img src="logo.png" alt="Rotary Club Biz Hub Logo" class="img-fluid mb-3" style="max-height: 120px; filter: drop-shadow(0 0 10px rgba(255, 184, 28, 0.25));">
                <div class="developer-credit-text mb-2">Developed by PHF Dhiren Pathak</div>
                <p class="text-secondary small">CRM & Business Networking Portal</p>
            </div>
            
            <!-- Tab switches -->
            <ul class="nav nav-tabs nav-justified border-secondary mb-4" id="loginTypeTabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active text-white border-0 bg-transparent fw-semibold" id="email-login-tab" data-bs-toggle="tab" data-bs-target="#email-login-panel" type="button">Email Login</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link text-white border-0 bg-transparent fw-semibold" id="phone-login-tab" data-bs-toggle="tab" data-bs-target="#phone-login-panel" type="button">Mobile OTP</button>
                </li>
            </ul>

            <div class="tab-content" id="loginTabsContent">
                <!-- EMAIL LOGIN -->
                <div class="tab-pane fade show active" id="email-login-panel" role="tabpanel">
                    <form id="emailLoginForm">
                        <div class="mb-3">
                            <label class="form-label text-secondary">Email Address</label>
                            <input type="email" class="form-control" id="loginEmail" placeholder="name@example.com" required>
                        </div>
                        <div class="mb-4">
                            <label class="form-label text-secondary">Password</label>
                            <input type="password" class="form-control" id="loginPassword" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="btn btn-accent w-100 py-2.5 mb-3">Login to Dashboard</button>
                    </form>
                </div>
                
                <!-- PHONE LOGIN -->
                <div class="tab-pane fade" id="phone-login-panel" role="tabpanel">
                    <form id="phoneLoginForm">
                        <div class="mb-3">
                            <label class="form-label text-secondary">Mobile Number (with Country Code)</label>
                            <input type="tel" class="form-control" id="loginMobile" placeholder="+91 98765 43210" required>
                        </div>
                        <div id="recaptcha-container"></div>
                        <button type="submit" class="btn btn-primary w-100 py-2.5 mb-3" id="sendOtpBtn">Send Verification OTP</button>
                    </form>

                    <!-- OTP Code Form (Hidden initially) -->
                    <form id="otpVerificationForm" style="display: none;">
                        <div class="mb-3">
                            <p class="text-info small mb-2"><i class="bi bi-info-circle"></i> If running in mock mode, use code: <strong>123456</strong></p>
                            <label class="form-label text-secondary">Enter 6-Digit OTP</label>
                            <input type="text" class="form-control text-center fs-4 letter-spacing-lg" id="otpCode" placeholder="000000" maxlength="6" required>
                        </div>
                        <button type="submit" class="btn btn-accent w-100 py-2.5 mb-3">Verify & Login</button>
                    </form>
                </div>
            </div>

            <div class="text-center mt-3">
                <span class="text-secondary small">New member?</span>
                <a href="#/register" class="text-rotary-gold fw-semibold small text-decoration-none" style="color: var(--rotary-gold)">Create Account</a>
            </div>
            
            <div class="text-center mt-3">
                <div class="position-relative my-3">
                    <hr class="border-secondary">
                    <span class="position-absolute top-50 start-50 translate-middle px-3 text-secondary small" style="background-color: #12162b !important;">OR</span>
                </div>
                <button id="googleSignInBtn" class="btn btn-outline-custom w-100 py-2 d-flex align-items-center justify-content-center gap-2">
                    <i class="bi bi-google text-danger"></i> Sign in with Google
                </button>
            </div>
            
            <div class="text-center mt-4 border-top border-secondary pt-3">
                <span class="badge bg-secondary p-2">
                    ${window.RotaryBizConfig.isMock ? '<i class="bi bi-shield-fill-check"></i> Demo Mode Active' : '<i class="bi bi-cloud-check-fill text-success"></i> Firebase Connected'}
                </span>
            </div>
        </div>
    `;

    // Google Login Submit
    document.getElementById('googleSignInBtn').addEventListener('click', async () => {
        try {
            await window.RotaryBizAuth.signInWithGoogle();
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleAuthError(err, "Google Sign-In Failed");
        }
    });

    // Email Login Submit
    document.getElementById('emailLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        
        try {
            await window.RotaryBizAuth.loginWithEmail(email, pass);
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleAuthError(err, "Login Failed");
        }
    });

    // Phone OTP request
    document.getElementById('phoneLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const number = document.getElementById('loginMobile').value;
        const sendBtn = document.getElementById('sendOtpBtn');
        
        sendBtn.disabled = true;
        sendBtn.innerText = "Requesting OTP...";
        
        try {
            await window.RotaryBizAuth.sendPhoneOTP(number, 'recaptcha-container');
            document.getElementById('phoneLoginForm').style.display = 'none';
            document.getElementById('otpVerificationForm').style.display = 'block';
            alert("OTP sent successfully!");
        } catch (err) {
            sendBtn.disabled = false;
            sendBtn.innerText = "Send Verification OTP";
            handleAuthError(err, "Failed to send OTP");
        }
    });

    // Verify OTP Submit
    document.getElementById('otpVerificationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('otpCode').value;
        try {
            await window.RotaryBizAuth.verifyPhoneOTP(code);
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleAuthError(err, "Verification Failed");
        }
    });
}

function renderRegisterView() {
    const authWrapper = document.getElementById('authWrapper');
    const categories = JSON.parse(localStorage.getItem('rotary_categories')) || [];
    const categoryOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    authWrapper.innerHTML = `
        <div class="auth-card glow-animation" style="max-width: 580px;">
            <div class="text-center mb-4">
                <img src="logo.png" alt="Rotary Club Biz Hub Logo" class="img-fluid mb-2" style="max-height: 80px; filter: drop-shadow(0 0 10px rgba(255, 184, 28, 0.25));">
                <h3 class="mb-1 text-white">Member Registration</h3>
                <div class="developer-credit-text mb-3">Developed by PHF Dhiren Pathak</div>
            </div>
            
            <form id="registrationForm">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label text-secondary">Full Name</label>
                        <input type="text" class="form-control" id="regName" placeholder="Rtn. John Doe" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label text-secondary">Mobile Number</label>
                        <input type="tel" class="form-control" id="regMobile" placeholder="+919876543210" required>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label text-secondary">Business Category</label>
                    <select class="form-select" id="regCategory" required>
                        <option value="" disabled selected>Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label text-secondary">Company Name</label>
                    <input type="text" class="form-control" id="regCompany" placeholder="Acme Technologies" required>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label text-secondary">Email Address</label>
                        <input type="email" class="form-control" id="regEmail" placeholder="email@company.com" required>
                    </div>
                    <div class="col-md-6 mb-4">
                        <label class="form-label text-secondary">Password</label>
                        <input type="password" class="form-control" id="regPassword" placeholder="Min. 6 chars" minlength="6" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-accent w-100 py-2.5 mb-3">Register & Enter Portal</button>
            </form>

            <div class="text-center mt-2">
                <span class="text-secondary small">Already registered?</span>
                <a href="#/login" class="text-rotary-gold fw-semibold small text-decoration-none" style="color: var(--rotary-gold)">Log In</a>
            </div>
        </div>
    `;

    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const mobile = document.getElementById('regMobile').value;
        const category = document.getElementById('regCategory').value;
        const company = document.getElementById('regCompany').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;

        try {
            await window.RotaryBizAuth.registerWithEmail(email, pass, name, mobile, company, category);
            alert("Registration successful!");
            window.location.hash = '#/dashboard';
        } catch (err) {
            handleAuthError(err, "Registration failed");
        }
    });
}


// ----------------------------------------------------
// 1. DASHBOARD VIEW (Analytics & Visual Metrics)
// ----------------------------------------------------
async function loadDashboardData() {
    try {
        const members = await window.RotaryBizDB.getMembers();
        const reqs = await window.RotaryBizDB.getRequirements();
        const refs = await window.RotaryBizDB.getReferrals();
        const quotes = await window.RotaryBizDB.getQuotes();
        
        // Dynamic counts
        document.getElementById('statMembersCount').innerText = members.length;
        document.getElementById('statRequirementsCount').innerText = reqs.filter(r => r.status === 'open').length;
        document.getElementById('statReferralsCount').innerText = refs.length;
        
        // Sum of Converted Referral Values
        const totalValue = refs.reduce((acc, curr) => acc + (curr.businessValue || 0), 0);
        document.getElementById('statBusinessValue').innerText = `₹${totalValue.toLocaleString('en-IN')}`;
        
        // Populate Unified Live Activity list
        renderRecentActivityFeed(refs, reqs, quotes);

        // Render Analytics Charts
        renderDashboardCharts(members, refs);

        // Load Club Sponsors
        await loadDashboardSponsors();
    } catch (e) {
        console.error("Error drawing dashboard data", e);
    }
}

async function loadDashboardSponsors() {
    try {
        const sponsors = await window.RotaryBizDB.getSponsors();
        const container = document.getElementById('dashboardSponsorsList');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const activeSponsors = sponsors.filter(s => {
            const start = s.startDate || "";
            const end = s.endDate || "";
            return (!start || today >= start) && (!end || today <= end);
        });

        if (activeSponsors.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-4 text-muted small"><i class="bi bi-info-circle"></i> No active sponsors. Contact the admin to advertise here.</div>`;
            container.style.animation = "none";
            return;
        }

        const cardsHtml = activeSponsors.map(s => `
            <div class="sponsor-marquee-card">
                <a href="${s.link}" target="_blank" class="text-decoration-none">
                    <div class="glass-card text-center p-3 h-100 d-flex flex-column align-items-center justify-content-center border border-secondary hover-scale" style="transition: transform 0.2s;">
                        <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px; background-color: rgba(255,255,255,0.05); padding: 5px; margin-bottom: 10px;">
                            <img src="${s.imageUrl}" alt="${s.name}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                        </div>
                        <h6 class="text-white mb-1 small text-truncate" style="max-width: 100%;">${s.name}</h6>
                        <p class="text-secondary mb-0 text-truncate" style="font-size: 0.75rem; max-width: 100%;">${s.tagline}</p>
                    </div>
                </a>
            </div>
        `).join('');

        // If there are more than 3 active sponsors, duplicate cards for a smooth infinite scroll loop
        if (activeSponsors.length > 3) {
            container.innerHTML = cardsHtml + cardsHtml;
            const duration = Math.max(15, activeSponsors.length * 6);
            container.style.animation = `marquee-scroll ${duration}s linear infinite`;
            container.classList.remove("justify-content-center", "w-100");
        } else {
            container.innerHTML = cardsHtml;
            container.style.animation = "none";
            // Align in center when there are few static logos
            container.classList.add("justify-content-center", "w-100");
        }
    } catch (e) {
        console.error("Failed to load dashboard sponsors", e);
    }
}

// Unified activity feed replacing only referrals activity list
// Left blank because renderRecentActivityFeed is appended at the bottom of the file

function renderDashboardCharts(members, refs) {
    // 1. Destroy existing charts if initialized
    if (valueChartInstance) valueChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (referralChartInstance) referralChartInstance.destroy();
    
    // Check if canvas elements exist
    const valCtx = document.getElementById('valueTrendChart');
    const catCtx = document.getElementById('categoryDistChart');
    const refCtx = document.getElementById('referralFunnelChart');
    if (!valCtx || !catCtx || !refCtx) return;

    // --- Chart 1: Business Value Trend (Line Chart by Month) ---
    // Extract monthly values
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySum = {};
    
    // Prefill last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
        monthlySum[key] = 0;
    }
    
    refs.filter(r => r.status === 'converted').forEach(r => {
        const d = new Date(r.updatedAt || r.createdAt);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
        if (monthlySum[key] !== undefined) {
            monthlySum[key] += r.businessValue;
        }
    });

    valueChartInstance = new Chart(valCtx, {
        type: 'line',
        data: {
            labels: Object.keys(monthlySum),
            datasets: [{
                label: 'Business Value Exchanged (₹)',
                data: Object.values(monthlySum),
                borderColor: '#FFB81C',
                backgroundColor: 'rgba(255, 184, 28, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#003DA5',
                pointBorderColor: '#FFB81C',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });

    // --- Chart 2: Member Category Distribution (Doughnut Chart) ---
    const categoriesCount = {};
    members.forEach(m => {
        if (m.category) {
            categoriesCount[m.category] = (categoriesCount[m.category] || 0) + 1;
        }
    });

    categoryChartInstance = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoriesCount),
            datasets: [{
                data: Object.values(categoriesCount),
                backgroundColor: [
                    '#003DA5', '#FFB81C', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'
                ],
                borderWidth: 1,
                borderColor: '#12162b'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc', font: { size: 10 } } }
            }
        }
    });

    // --- Chart 3: Referral Status (Bar Chart) ---
    const statusLogs = { 'pending': 0, 'connected': 0, 'in-progress': 0, 'converted': 0, 'closed-lost': 0 };
    refs.forEach(r => {
        if (statusLogs[r.status] !== undefined) {
            statusLogs[r.status]++;
        }
    });

    referralChartInstance = new Chart(refCtx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Connected', 'In Progress', 'Converted', 'Lost'],
            datasets: [{
                data: [statusLogs['pending'], statusLogs['connected'], statusLogs['in-progress'], statusLogs['converted'], statusLogs['closed-lost']],
                backgroundColor: ['#eab308', '#06b6d4', '#3b82f6', '#10b981', '#ef4444'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}


// ----------------------------------------------------
// 2. MEMBER DIRECTORY (Directory, Category filters, WhatsApp chats)
// ----------------------------------------------------
let allMembersList = [];

async function loadDirectoryData() {
    const listContainer = document.getElementById('directoryMembersList');
    if (!listContainer) return;
    
    listContainer.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" role="status"></div></div>`;
    
    try {
        allMembersList = await window.RotaryBizDB.getMembers();
        populateDirectoryFilterDropdown(allMembersList);
        renderDirectoryCards(allMembersList);

        // Bind Search & Filters
        document.getElementById('directorySearch').addEventListener('input', filterDirectory);
        document.getElementById('directoryCategoryFilter').addEventListener('change', filterDirectory);
    } catch (e) {
        listContainer.innerHTML = `<div class="alert alert-danger">Error loading directory: ${e.message}</div>`;
    }
}

function populateDirectoryFilterDropdown(members) {
    const filter = document.getElementById('directoryCategoryFilter');
    if (!filter) return;
    
    // Extract unique categories
    const categories = [...new Set(members.map(m => m.category).filter(Boolean))];
    
    filter.innerHTML = `<option value="">All Categories</option>` + 
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderDirectoryCards(members) {
    const container = document.getElementById('directoryMembersList');
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5 text-muted">No members match your search criteria.</div>`;
        return;
    }

    container.innerHTML = members.map(m => {
        const prodBadges = (m.products || []).slice(0, 3).map(p => `<span class="badge bg-secondary badge-custom me-1">${p}</span>`).join('');
        const servBadges = (m.services || []).slice(0, 3).map(s => `<span class="badge bg-dark badge-custom border border-secondary text-secondary me-1">${s}</span>`).join('');
        
        return `
            <div class="col-xl-4 col-md-6 mb-4">
                <div class="glass-card d-flex flex-column justify-content-between h-100">
                    <div>
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="profile-logo-wrap">
                                <img src="${m.logoUrl || 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=60'}" alt="${m.companyName}">
                            </div>
                            <div>
                                <h5 class="mb-1 text-white">${m.name}</h5>
                                <span class="badge bg-primary badge-custom mb-1" style="background-color: var(--rotary-blue) !important">${m.category}</span>
                                <small class="text-secondary d-block">${m.companyName}</small>
                            </div>
                        </div>
                        <p class="text-secondary mb-3 small line-clamp-3">${m.description || 'No business description provided yet.'}</p>
                        
                        ${prodBadges ? `<div class="mb-2"><small class="text-muted d-block mb-1">Products:</small> ${prodBadges}</div>` : ''}
                        ${servBadges ? `<div class="mb-3"><small class="text-muted d-block mb-1">Services:</small> ${servBadges}</div>` : ''}
                    </div>

                    <div class="border-top border-secondary pt-3 mt-3 d-flex gap-2">
                        <a href="https://wa.me/${m.whatsapp || m.mobile.replace(/[^0-9]/g, '')}" target="_blank" class="btn whatsapp-btn flex-grow-1">
                            <i class="bi bi-whatsapp"></i> Chat on WhatsApp
                        </a>
                        <button onclick="triggerSendReferralFromDirectory('${m.uid}', '${m.name}')" class="btn btn-outline-custom">
                            <i class="bi bi-person-plus"></i> Refer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterDirectory() {
    const search = document.getElementById('directorySearch').value.toLowerCase();
    const cat = document.getElementById('directoryCategoryFilter').value;

    const filtered = allMembersList.filter(m => {
        const matchesSearch = 
            m.name.toLowerCase().includes(search) ||
            m.companyName.toLowerCase().includes(search) ||
            (m.products && m.products.some(p => p.toLowerCase().includes(search))) ||
            (m.services && m.services.some(s => s.toLowerCase().includes(search)));
            
        const matchesCategory = cat === "" || m.category === cat;
        
        return matchesSearch && matchesCategory;
    });

    renderDirectoryCards(filtered);
}

// Global click event binder to route referral modal setup
window.triggerSendReferralFromDirectory = function(uid, name) {
    window.location.hash = '#/referrals';
    setTimeout(() => {
        const modalEl = document.getElementById('createReferralModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            document.getElementById('refRecipient').value = uid;
            modal.show();
        }
    }, 100);
};


// ----------------------------------------------------
// 3. BUSINESS PROFILE (Logo upload, Tag Badges UI)
// ----------------------------------------------------
async function loadProfileData() {
    if (!currentUser) return;
    
    // Load inputs
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileMobile').value = currentUser.mobile || '';
    document.getElementById('profileCompany').value = currentUser.companyName || '';
    document.getElementById('profileCategory').value = currentUser.category || '';
    document.getElementById('profileDescription').value = currentUser.description || '';
    document.getElementById('profileAddress').value = currentUser.address || '';
    
    // Logo Preview
    const preview = document.getElementById('profileLogoPreview');
    if (preview) {
        preview.src = currentUser.logoUrl || 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=60';
    }

    // Render lists of products/services
    renderProfileTags('profileProductsList', currentUser.products || []);
    renderProfileTags('profileServicesList', currentUser.services || []);

    // Product/Service tag additions
    document.getElementById('addProdBtn').onclick = () => addProfileTag('prodInput', 'profileProductsList', 'products');
    document.getElementById('addServBtn').onclick = () => addProfileTag('servInput', 'profileServicesList', 'services');

    // Save profile form listener
    const form = document.getElementById('businessProfileForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('profileLogoInput');
        let logoUrl = currentUser.logoUrl || '';
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            logoUrl = await window.RotaryBizDB.uploadLogo(file, currentUser.uid);
        }

        const updated = {
            name: document.getElementById('profileName').value,
            companyName: document.getElementById('profileCompany').value,
            category: document.getElementById('profileCategory').value,
            description: document.getElementById('profileDescription').value,
            address: document.getElementById('profileAddress').value,
            logoUrl: logoUrl,
            whatsapp: document.getElementById('profileMobile').value.replace(/[^0-9]/g, '')
        };

        try {
            await window.RotaryBizDB.updateMemberProfile(currentUser.uid, updated);
            // Refresh local reference
            currentUser = { ...currentUser, ...updated };
            sessionStorage.setItem('rotary_active_user', JSON.stringify(currentUser));
            alert("Profile updated successfully!");
            window.location.hash = '#/dashboard';
        } catch (err) {
            alert("Failed to update profile: " + err.message);
        }
    };
}

function renderProfileTags(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = `<span class="text-muted small">None added yet.</span>`;
        return;
    }
    
    container.innerHTML = list.map((tag, idx) => `
        <span class="badge bg-secondary badge-custom me-2 mb-2 p-2">
            ${tag} <i class="bi bi-x-circle text-danger ms-1 cursor-pointer" onclick="deleteProfileTag('${containerId}', ${idx})"></i>
        </span>
    `).join('');
}

async function addProfileTag(inputId, containerId, dbKey) {
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    if (!value) return;

    if (!currentUser[dbKey]) currentUser[dbKey] = [];
    currentUser[dbKey].push(value);
    
    // Save to db
    await window.RotaryBizDB.updateMemberProfile(currentUser.uid, { [dbKey]: currentUser[dbKey] });
    sessionStorage.setItem('rotary_active_user', JSON.stringify(currentUser));
    
    input.value = '';
    renderProfileTags(containerId, currentUser[dbKey]);
}

window.deleteProfileTag = async function(containerId, index) {
    const dbKey = containerId.includes('Products') ? 'products' : 'services';
    if (currentUser[dbKey]) {
        currentUser[dbKey].splice(index, 1);
        await window.RotaryBizDB.updateMemberProfile(currentUser.uid, { [dbKey]: currentUser[dbKey] });
        sessionStorage.setItem('rotary_active_user', JSON.stringify(currentUser));
        renderProfileTags(containerId, currentUser[dbKey]);
    }
};


// ----------------------------------------------------
// 4 & 5. REQUIREMENTS BOARD & QUOTATION MANAGEMENT
// ----------------------------------------------------
let activeRequirements = [];

async function loadRequirementsData() {
    const board = document.getElementById('requirementsBoardGrid');
    if (!board) return;
    
    board.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-warning" role="status"></div></div>`;
    
    try {
        activeRequirements = await window.RotaryBizDB.getRequirements();
        const quotes = await window.RotaryBizDB.getQuotes();
        
        renderRequirementsGrid(activeRequirements, quotes);
        setupRequirementModalListeners();
        
        // Populate My Submitted Quotations
        renderMyQuotesTable(quotes, activeRequirements);
    } catch (e) {
        board.innerHTML = `<div class="alert alert-danger">Error loading requirements: ${e.message}</div>`;
    }
}

function renderRequirementsGrid(reqs, quotes = []) {
    const board = document.getElementById('requirementsBoardGrid');
    if (!board) return;

    if (reqs.length === 0) {
        board.innerHTML = `<div class="col-12 text-center py-5 text-muted">No business requirements listed. Be the first to create one!</div>`;
        return;
    }

    board.innerHTML = reqs.map(r => {
        const isCreator = r.creatorId === currentUser.uid;
        const isOpen = r.status === 'open';
        
        // Count quotes for this requirement
        const reqQuotes = quotes.filter(q => q.requirementId === r.id);
        const quoteCount = reqQuotes.length;
        
        let quoteInfoLine = '';
        if (isCreator) {
            quoteInfoLine = `<div class="col-12 mt-1 text-info small"><i class="bi bi-envelope-open text-warning"></i> Bids Received: <strong>${quoteCount}</strong></div>`;
        } else {
            const hasQuoted = reqQuotes.some(q => q.vendorId === currentUser.uid);
            if (hasQuoted) {
                quoteInfoLine = `<div class="col-12 mt-1 text-success small"><i class="bi bi-check-circle-fill"></i> You have submitted a quotation</div>`;
            }
        }
        
        let footerActions = '';
        if (isCreator) {
            footerActions = `
                <div class="d-flex gap-2 w-100 mt-3 border-top border-secondary pt-3">
                    <button onclick="triggerViewQuotes('${r.id}', '${r.title}')" class="btn btn-primary btn-sm flex-grow-1">
                        <i class="bi bi-file-earmark-spreadsheet"></i> Quotes (${quoteCount})
                    </button>
                    ${isOpen ? `
                        <button onclick="triggerCloseRequirement('${r.id}')" class="btn btn-danger btn-sm">
                            Close
                        </button>
                    ` : '<span class="badge bg-secondary p-2 w-100 text-center">Closed</span>'}
                </div>
            `;
        } else if (isOpen) {
            footerActions = `
                <div class="d-flex w-100 mt-3 border-top border-secondary pt-3">
                    <button onclick="triggerSubmitQuoteModal('${r.id}', '${r.title}', '${r.creatorCompany}')" class="btn btn-accent btn-sm w-100">
                        <i class="bi bi-tag-fill"></i> Submit Quotation
                    </button>
                </div>
            `;
        } else {
            footerActions = `
                <div class="w-100 mt-3 border-top border-secondary pt-3 text-center">
                    <span class="badge bg-secondary p-2 w-100 text-center">Requirement Closed</span>
                </div>
            `;
        }

        return `
            <div class="col-md-6 mb-4">
                <div class="glass-card d-flex flex-column justify-content-between h-100">
                    <div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary badge-custom" style="background-color: var(--rotary-blue) !important">${r.category}</span>
                            <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'} badge-custom">${isOpen ? 'Open' : 'Closed'}</span>
                        </div>
                        <h5 class="text-white mt-1 mb-2">${r.title}</h5>
                        <p class="text-secondary small mb-3">${r.description}</p>
                        
                        <div class="row g-2 mb-2 text-white small">
                            <div class="col-6"><i class="bi bi-hash text-warning"></i> Qty: <strong>${r.quantity}</strong></div>
                            <div class="col-6"><i class="bi bi-currency-rupee text-warning"></i> Budget: <strong>₹${r.budget.toLocaleString()}</strong></div>
                            <div class="col-6"><i class="bi bi-person text-secondary"></i> Posted by: <strong>${r.creatorName}</strong></div>
                            <div class="col-6"><i class="bi bi-calendar-event text-secondary"></i> Deadline: <strong>${r.deadline}</strong></div>
                            ${quoteInfoLine}
                        </div>
                    </div>
                    ${footerActions}
                </div>
            </div>
        `;
    }).join('');
}

function setupRequirementModalListeners() {
    // Create new requirement form
    const form = document.getElementById('createRequirementForm');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const newReq = {
                title: document.getElementById('reqTitle').value,
                description: document.getElementById('reqDesc').value,
                category: document.getElementById('reqCategory').value,
                quantity: Number(document.getElementById('reqQty').value),
                budget: Number(document.getElementById('reqBudget').value),
                deadline: document.getElementById('reqDeadline').value,
                creatorId: currentUser.uid,
                creatorName: currentUser.name,
                creatorCompany: currentUser.companyName,
                status: 'open'
            };

            try {
                await window.RotaryBizDB.createRequirement(newReq);
                bootstrap.Modal.getInstance(document.getElementById('createRequirementModal')).hide();
                form.reset();
                alert("Requirement posted successfully!");
                loadRequirementsData();
            } catch (err) {
                alert("Failed to submit: " + err.message);
            }
        };
    }
}

window.triggerCloseRequirement = async function(reqId) {
    if (confirm("Are you sure you want to close this requirement? No further quotes will be allowed.")) {
        await window.RotaryBizDB.updateRequirement(reqId, { status: 'closed' });
        loadRequirementsData();
    }
};

// --- QUOTATION SUBMISSION MODAL CONFIG ---
window.triggerSubmitQuoteModal = function(reqId, title, company) {
    const modalEl = document.getElementById('submitQuoteModal');
    if (!modalEl) return;
    
    document.getElementById('quoteReqId').value = reqId;
    document.getElementById('quoteReqTitle').innerText = title;
    document.getElementById('quoteReqCompany').innerText = company;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Submission binder
    const form = document.getElementById('submitQuoteForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const bid = {
            requirementId: reqId,
            vendorId: currentUser.uid,
            vendorName: currentUser.name,
            vendorCompanyName: currentUser.companyName,
            price: Number(document.getElementById('quotePrice').value),
            deliveryDays: Number(document.getElementById('quoteDelivery').value),
            notes: document.getElementById('quoteNotes').value,
            status: 'pending'
        };

        try {
            await window.RotaryBizDB.submitQuote(bid);
            modal.hide();
            form.reset();
            alert("Quotation submitted successfully!");
            loadRequirementsData();
        } catch (err) {
            alert("Submission error: " + err.message);
        }
    };
};

// --- QUOTATION COMPARISON MODAL ENGINE ---
window.triggerViewQuotes = async function(reqId, title) {
    const modalEl = document.getElementById('compareQuotesModal');
    if (!modalEl) return;
    
    document.getElementById('compareReqTitle').innerText = title;
    const tbody = document.getElementById('compareQuotesTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></td></tr>`;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    try {
        const quotes = await window.RotaryBizDB.getQuotesForRequirement(reqId);
        if (quotes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-secondary">No bids submitted yet for this requirement.</td></tr>`;
            return;
        }

        tbody.innerHTML = quotes.map(q => {
            let statusBtn = '';
            if (q.status === 'pending') {
                statusBtn = `
                    <div class="d-flex gap-1 justify-content-center">
                        <button onclick="updateBidStatus('${q.id}', 'accepted', '${reqId}', '${title}')" class="btn btn-success btn-sm p-1 px-2"><i class="bi bi-check-lg"></i></button>
                        <button onclick="updateBidStatus('${q.id}', 'rejected', '${reqId}', '${title}')" class="btn btn-danger btn-sm p-1 px-2"><i class="bi bi-x-lg"></i></button>
                    </div>
                `;
            } else {
                statusBtn = `<span class="badge ${q.status === 'accepted' ? 'bg-success' : 'bg-danger'} badge-custom text-capitalize">${q.status}</span>`;
            }

            return `
                <tr>
                    <td class="text-white">
                        <strong>${q.vendorName}</strong>
                        <small class="text-secondary d-block">${q.vendorCompanyName}</small>
                    </td>
                    <td class="text-warning font-semibold">₹${q.price.toLocaleString()}</td>
                    <td>${q.deliveryDays} Days</td>
                    <td><small class="text-secondary">${q.notes || '-'}</small></td>
                    <td class="text-center">${statusBtn}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger py-4">Error loading quotes: ${e.message}</td></tr>`;
    }
};

window.updateBidStatus = async function(quoteId, status, reqId, title) {
    if (confirm(`Are you sure you want to mark this quote as ${status}?`)) {
        await window.RotaryBizDB.updateQuoteStatus(quoteId, status);
        
        // If accepted, close requirement
        if (status === 'accepted') {
            await window.RotaryBizDB.updateRequirement(reqId, { status: 'closed' });
            bootstrap.Modal.getInstance(document.getElementById('compareQuotesModal')).hide();
            loadRequirementsData();
        } else {
            // refresh view
            triggerViewQuotes(reqId, title);
        }
    }
};


// ----------------------------------------------------
// 6. REFERRAL MANAGEMENT (Log referrals, Tracking stages)
// ----------------------------------------------------
let allReferrals = [];

async function loadReferralsData() {
    const rGrid = document.getElementById('referralsReceivedGrid');
    const gGrid = document.getElementById('referralsGivenGrid');
    if (!rGrid || !gGrid) return;
    
    rGrid.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>`;
    gGrid.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>`;

    try {
        allReferrals = await window.RotaryBizDB.getReferrals();
        const members = await window.RotaryBizDB.getMembers();
        
        // Populate "To Member" dropdown in "Create Referral" modal
        const recipientDropdown = document.getElementById('refRecipient');
        if (recipientDropdown) {
            recipientDropdown.innerHTML = `<option value="" disabled selected>Select Recipient Member</option>` +
                members.filter(m => m.uid !== currentUser.uid).map(m => `<option value="${m.uid}">${m.name} (${m.companyName})</option>`).join('');
        }

        renderReferralsTable(allReferrals);
        setupReferralFormListener(members);
    } catch (e) {
        console.error("Error loading referrals view", e);
    }
}

function renderReferralsTable(refs) {
    const rGrid = document.getElementById('referralsReceivedGrid');
    const gGrid = document.getElementById('referralsGivenGrid');

    const received = refs.filter(r => r.toId === currentUser.uid);
    const given = refs.filter(r => r.fromId === currentUser.uid);

    // Render Received
    if (received.length === 0) {
        rGrid.innerHTML = `<div class="text-center text-secondary py-4">No referrals received yet.</div>`;
    } else {
        rGrid.innerHTML = received.map(r => getReferralCardHtml(r, true)).join('');
    }

    // Render Given
    if (given.length === 0) {
        gGrid.innerHTML = `<div class="text-center text-secondary py-4">No referrals given yet.</div>`;
    } else {
        gGrid.innerHTML = given.map(r => getReferralCardHtml(r, false)).join('');
    }
}

function getReferralCardHtml(r, isReceived) {
    let statusClass = 'bg-warning text-dark';
    let statusText = r.status.toUpperCase();
    
    if (r.status === 'in-progress') statusClass = 'bg-primary';
    if (r.status === 'converted') statusClass = 'bg-success';
    if (r.status === 'closed-lost') statusClass = 'bg-danger';
    if (r.status === 'connected') statusClass = 'bg-info';
    
    // Actions only for recipient
    let actionButtons = '';
    if (isReceived && r.status !== 'converted' && r.status !== 'closed-lost') {
        actionButtons = `
            <div class="dropdown mt-2">
                <button class="btn btn-outline-custom btn-sm dropdown-toggle w-100" type="button" data-bs-toggle="dropdown">
                    Update Status
                </button>
                <ul class="dropdown-menu dropdown-menu-dark">
                    <li><a class="dropdown-item" href="#" onclick="updateReferral(${JSON.stringify(r.id).replace(/"/g, '&quot;')}, 'connected')">Mark Connected</a></li>
                    <li><a class="dropdown-item" href="#" onclick="updateReferral(${JSON.stringify(r.id).replace(/"/g, '&quot;')}, 'in-progress')">Mark In Progress</a></li>
                    <li><a class="dropdown-item text-success fw-bold" href="#" onclick="triggerReferralWonModal(${JSON.stringify(r.id).replace(/"/g, '&quot;')})">Mark Converted (Won)</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="updateReferral(${JSON.stringify(r.id).replace(/"/g, '&quot;')}, 'closed-lost')">Mark Closed (Lost)</a></li>
                </ul>
            </div>
        `;
    }

    return `
        <div class="glass-card mb-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="text-white mb-0">${isReceived ? `From: ${r.fromName} (${r.fromCompany})` : `To: ${r.toName} (${r.toCompany})`}</h6>
                <span class="badge ${statusClass} badge-custom">${statusText}</span>
            </div>
            <p class="text-secondary small mb-2">Client: <strong>${r.clientName}</strong> (${r.clientContact})</p>
            <p class="text-secondary small mb-2">Details: ${r.description}</p>
            ${r.businessValue > 0 ? `<p class="text-success small mb-0 fw-semibold"><i class="bi bi-award-fill"></i> Generated Business Value: <strong>₹${r.businessValue.toLocaleString()}</strong></p>` : ''}
            ${actionButtons}
        </div>
    `;
}

function setupReferralFormListener(members) {
    const form = document.getElementById('createReferralForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const toId = document.getElementById('refRecipient').value;
        const matchedRecipient = members.find(m => m.uid === toId);

        const newRef = {
            fromId: currentUser.uid,
            fromName: currentUser.name,
            fromCompany: currentUser.companyName,
            toId: toId,
            toName: matchedRecipient.name,
            toCompany: matchedRecipient.companyName,
            clientName: document.getElementById('refClientName').value,
            clientContact: document.getElementById('refClientContact').value,
            description: document.getElementById('refDesc').value,
            status: 'pending',
            businessValue: 0
        };

        try {
            await window.RotaryBizDB.createReferral(newRef);
            bootstrap.Modal.getInstance(document.getElementById('createReferralModal')).hide();
            form.reset();
            alert("Referral logged successfully!");
            loadReferralsData();
        } catch (err) {
            alert("Error logging referral: " + err.message);
        }
    };
}

window.updateReferral = async function(refId, status, businessValue = 0) {
    try {
        await window.RotaryBizDB.updateReferralStatus(refId, status, businessValue);
        loadReferralsData();
    } catch (e) {
        alert("Error updating status: " + e.message);
    }
};

window.triggerReferralWonModal = function(refId) {
    const value = prompt("Enter final Business Generated Value (₹ in INR) won from this referral:", "10000");
    if (value !== null) {
        const amt = Number(value.replace(/[^0-9]/g, ''));
        if (isNaN(amt) || amt <= 0) {
            alert("Please enter a valid numeric value.");
            return;
        }
        updateReferral(refId, 'converted', amt);
    }
};


// ----------------------------------------------------
// 8. REPORTS & EXPORTS (Excel & PDF Generators)
// ----------------------------------------------------
async function loadReportsData() {
    // Populate simple aggregate summaries
    try {
        const members = await window.RotaryBizDB.getMembers();
        const refs = await window.RotaryBizDB.getReferrals();
        
        document.getElementById('repTotalMembers').innerText = members.length;
        document.getElementById('repTotalReferrals').innerText = refs.length;
        
        const totalValue = refs.reduce((acc, curr) => acc + (curr.businessValue || 0), 0);
        document.getElementById('repBusinessValue').innerText = `₹${totalValue.toLocaleString()}`;

        // Bind buttons
        document.getElementById('btnExportDirectoryExcel').onclick = () => exportDirectoryToExcel(members);
        document.getElementById('btnExportReferralsExcel').onclick = () => exportReferralsToExcel(refs);
        document.getElementById('btnExportPDFReport').onclick = () => exportReferralsPDF(refs);
    } catch (e) {
        console.error("Reports loading error", e);
    }
}

// XLSX Member Directory Export
function exportDirectoryToExcel(members) {
    try {
        const rows = members.map(m => ({
            "Rotarian Name": m.name,
            "Email Address": m.email,
            "Mobile No": m.mobile,
            "Company Name": m.companyName,
            "Business Category": m.category,
            "Products": (m.products || []).join(', '),
            "Services": (m.services || []).join(', '),
            "Address": m.address || '',
            "Registration Date": m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Member Directory");
        
        XLSX.writeFile(workbook, "Rotary_BizHub_Directory.xlsx");
    } catch (e) {
        alert("Excel export failed: " + e.message);
    }
}

// XLSX Referrals Log Export
function exportReferralsToExcel(refs) {
    try {
        const rows = refs.map(r => ({
            "Sender Name": r.fromName,
            "Sender Company": r.fromCompany,
            "Receiver Name": r.toName,
            "Receiver Company": r.toCompany,
            "Client Name": r.clientName,
            "Client Contact": r.clientContact,
            "Description": r.description,
            "Status": r.status.toUpperCase(),
            "Business Value (INR)": r.businessValue || 0,
            "Date Logged": new Date(r.createdAt).toLocaleDateString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Referrals Log");
        
        XLSX.writeFile(workbook, "Rotary_BizHub_Referrals.xlsx");
    } catch (e) {
        alert("Excel export failed: " + e.message);
    }
}

// PDF Referrals Summary Report Export (jsPDF + AutoTable)
function exportReferralsPDF(refs) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title branding header
        doc.setFillColor(0, 61, 165); // Rotary Royal Blue
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("ROTARY CLUB BIZ HUB", 14, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Business Referrals Analytics & Log Summary", 14, 30);
        
        // Metadata
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`Report Generated On: ${new Date().toLocaleString()}`, 14, 48);
        doc.text(`Active User Session: ${currentUser.name}`, 14, 54);

        // Stats summary blocks
        const totalReferrals = refs.length;
        const converted = refs.filter(r => r.status === 'converted').length;
        const totalValue = refs.reduce((acc, curr) => acc + (curr.businessValue || 0), 0);

        doc.setFillColor(245, 245, 245);
        doc.rect(14, 60, 182, 22, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("PORTAL METRICS:", 20, 68);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Referrals: ${totalReferrals}   |   Converted (Won): ${converted}   |   Generated Value: Rs. ${totalValue.toLocaleString()}`, 20, 75);

        // Referral Table mapping
        const tableData = refs.map((r, idx) => [
            idx + 1,
            `${r.fromName}\n(${r.fromCompany})`,
            `${r.toName}\n(${r.toCompany})`,
            `${r.clientName}`,
            r.status.toUpperCase(),
            `Rs. ${r.businessValue.toLocaleString()}`
        ]);

        doc.autoTable({
            startY: 90,
            head: [['#', 'Referrer (From)', 'Referee (To)', 'Client', 'Status', 'Value (INR)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [0, 61, 165], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            styles: { fontSize: 8, cellPadding: 3 }
        });

        doc.save("Rotary_Referrals_Summary_Report.pdf");
    } catch (e) {
        alert("PDF export failed: " + e.message);
    }
}


// ----------------------------------------------------
// 9. SETTINGS & GOOGLE SHEETS SYNC ENGINE
// ----------------------------------------------------
function loadSettingsView() {
    const sheetsUrlInput = document.getElementById('setGoogleSheetsUrl');
    const syncEnabledCheck = document.getElementById('setGoogleSheetsEnabled');
    
    if (sheetsUrlInput) {
        sheetsUrlInput.value = window.RotaryBizConfig.googleSheetsUrl || '';
    }
    if (syncEnabledCheck) {
        syncEnabledCheck.checked = window.RotaryBizConfig.useGoogleSheets;
    }

    // Status Label display
    const statusText = document.getElementById('firebaseStatusIndicator');
    if (statusText) {
        if (window.RotaryBizConfig.useGoogleSheets && window.RotaryBizConfig.googleSheetsUrl) {
            statusText.innerHTML = `<div class="alert alert-success py-2 mb-0"><i class="bi bi-cloud-check-fill"></i> **Connected to Google Sheets**. All transactions automatically synchronize with your spreadsheet backend.</div>`;
        } else {
            statusText.innerHTML = `<div class="alert alert-warning py-2 mb-0"><i class="bi bi-shield-lock"></i> Currently running in **Pure Local Storage Mode**. Data is saved inside your local browser. Use the JSON backup tools below to share state.</div>`;
        }
    }

    // Save triggers
    const form = document.getElementById('firebaseSettingsForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const url = document.getElementById('setGoogleSheetsUrl').value.trim();
            const enableSync = document.getElementById('setGoogleSheetsEnabled').checked;
            window.RotaryBizConfig.saveConfig(url, enableSync);
        };
    }

    const resetBtn = document.getElementById('btnResetToMock');
    if (resetBtn) {
        resetBtn.onclick = () => {
            window.RotaryBizConfig.resetConfig();
        };
    }

    // JSON backup binds
    const btnExport = document.getElementById('btnBackupExportJson');
    if (btnExport) {
        btnExport.onclick = () => {
            window.RotaryBizDB.exportDatabase();
        };
    }

    const inputImport = document.getElementById('inputBackupImportJson');
    if (inputImport) {
        inputImport.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (evt) => {
                window.RotaryBizDB.importDatabase(evt.target.result);
            };
            reader.readAsText(file);
        };
    }
}

// ----------------------------------------------------
// DYNAMIC CATEGORIES & FEED ENHANCEMENTS
// ----------------------------------------------------
async function populateCategoryDropdowns() {
    const categories = await window.RotaryBizDB.getCategories();
    
    // 1. Profile select
    const profileSelect = document.getElementById('profileCategory');
    if (profileSelect) {
        const currentVal = profileSelect.value;
        profileSelect.innerHTML = `<option value="" disabled selected>Select Category</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        if (currentVal && categories.includes(currentVal)) {
            profileSelect.value = currentVal;
        }
    }

    // 2. Requirement select
    const reqSelect = document.getElementById('reqCategory');
    if (reqSelect) {
        reqSelect.innerHTML = `<option value="" disabled selected>Select Category</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // 3. Directory filter
    const directoryFilter = document.getElementById('directoryCategoryFilter');
    if (directoryFilter) {
        const currentVal = directoryFilter.value;
        directoryFilter.innerHTML = `<option value="">All Categories</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        if (currentVal) directoryFilter.value = currentVal;
    }
    
    // 4. Admin Add Member Category select
    const adminMemSelect = document.getElementById('adminMemCategory');
    if (adminMemSelect) {
        adminMemSelect.innerHTML = `<option value="" disabled selected>Select Category</option>` + 
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function renderRecentActivityFeed(refs, reqs, quotes) {
    const list = document.getElementById('dashboardRecentReferrals');
    if (!list) return;
    
    const activities = [];
    
    // Map referrals
    refs.forEach(r => {
        let statusBadge = '';
        switch (r.status) {
            case 'pending': statusBadge = '<span class="badge bg-warning text-dark badge-custom">Pending</span>'; break;
            case 'connected': statusBadge = '<span class="badge bg-info badge-custom">Connected</span>'; break;
            case 'in-progress': statusBadge = '<span class="badge bg-primary badge-custom">In Progress</span>'; break;
            case 'converted': statusBadge = `<span class="badge bg-success badge-custom">Won (₹${r.businessValue.toLocaleString()})</span>`; break;
            case 'closed-lost': statusBadge = '<span class="badge bg-danger badge-custom">Lost</span>'; break;
        }
        
        activities.push({
            date: new Date(r.createdAt),
            html: `
                <li class="list-group-item bg-transparent border-bottom border-secondary py-3 d-flex justify-content-between align-items-start text-white">
                    <div class="d-flex gap-3 align-items-start">
                        <div class="stat-icon icon-blue p-2 fs-6 rounded" style="margin-top:2px;"><i class="bi bi-share-fill"></i></div>
                        <div>
                            <h6 class="mb-1 text-white">${r.fromName} <i class="bi bi-arrow-right text-warning small mx-1"></i> ${r.toName}</h6>
                            <small class="text-secondary d-block">Referred client <strong>${r.clientName}</strong>: ${r.description}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        ${statusBadge}
                        <small class="text-muted d-block mt-1" style="font-size:0.75rem;">${new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                </li>
            `
        });
    });

    // Map requirements
    reqs.forEach(req => {
        activities.push({
            date: new Date(req.createdAt),
            html: `
                <li class="list-group-item bg-transparent border-bottom border-secondary py-3 d-flex justify-content-between align-items-start text-white">
                    <div class="d-flex gap-3 align-items-start">
                        <div class="stat-icon icon-gold p-2 fs-6 rounded" style="margin-top:2px;"><i class="bi bi-clipboard-plus-fill"></i></div>
                        <div>
                            <h6 class="mb-1 text-white">${req.creatorName} (${req.creatorCompany})</h6>
                            <small class="text-secondary d-block">Posted a Requirement: <strong>${req.title}</strong> (Category: ${req.category})</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-info badge-custom">Posted</span>
                        <small class="text-muted d-block mt-1" style="font-size:0.75rem;">${new Date(req.createdAt).toLocaleDateString()}</small>
                    </div>
                </li>
            `
        });
    });

    // Map quotes
    const reqTitleMap = {};
    reqs.forEach(req => { reqTitleMap[req.id] = req.title; });
    
    quotes.forEach(q => {
        const reqTitle = reqTitleMap[q.requirementId] || 'Requirement';
        activities.push({
            date: new Date(q.createdAt),
            html: `
                <li class="list-group-item bg-transparent border-bottom border-secondary py-3 d-flex justify-content-between align-items-start text-white">
                    <div class="d-flex gap-3 align-items-start">
                        <div class="stat-icon icon-blue p-2 fs-6 rounded" style="margin-top:2px;"><i class="bi bi-tag-fill"></i></div>
                        <div>
                            <h6 class="mb-1 text-white">${q.vendorName} (${q.vendorCompanyName})</h6>
                            <small class="text-secondary d-block">Quoted ₹${q.price.toLocaleString()} for requirement: <strong>${reqTitle}</strong></small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-warning text-dark badge-custom">Quote Sent</span>
                        <small class="text-muted d-block mt-1" style="font-size:0.75rem;">${new Date(q.createdAt).toLocaleDateString()}</small>
                    </div>
                </li>
            `
        });
    });

    // Sort descending
    activities.sort((a, b) => b.date - a.date);
    
    const latest = activities.slice(0, 10);
    if (latest.length === 0) {
        list.innerHTML = `<li class="list-group-item bg-transparent text-muted text-center border-0 py-3">No activity logged yet.</li>`;
    } else {
        list.innerHTML = latest.map(act => act.html).join('');
    }
}

function renderMyQuotesTable(quotes, reqs) {
    const tbody = document.getElementById('myQuotesTableBody');
    if (!tbody) return;
    
    const myQuotes = quotes.filter(q => q.vendorId === currentUser.uid);
    if (myQuotes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-secondary">You haven't submitted any quotations yet.</td></tr>`;
        return;
    }
    
    const reqMap = {};
    reqs.forEach(r => { reqMap[r.id] = r; });
    
    tbody.innerHTML = myQuotes.map(q => {
        const req = reqMap[q.requirementId];
        const reqTitle = req ? req.title : 'Deleted Requirement';
        const buyerCompany = req ? req.creatorCompany : 'Unknown Company';
        
        let statusBadge = '';
        switch (q.status) {
            case 'pending': statusBadge = '<span class="badge bg-warning text-dark">Pending</span>'; break;
            case 'accepted': statusBadge = '<span class="badge bg-success">Accepted</span>'; break;
            case 'rejected': statusBadge = '<span class="badge bg-danger">Rejected</span>'; break;
        }
        
        return `
            <tr>
                <td class="text-white"><strong>${reqTitle}</strong></td>
                <td>${buyerCompany}</td>
                <td class="text-warning font-semibold">₹${q.price.toLocaleString()}</td>
                <td>${q.deliveryDays} Days</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// ----------------------------------------------------
// 10. ADMIN CONSOLE OPERATIONS
// ----------------------------------------------------
async function loadAdminData() {
    try {
        const cats = await window.RotaryBizDB.getCategories();
        const members = await window.RotaryBizDB.getMembers();
        
        // 1. Render categories
        const catList = document.getElementById('adminCategoriesList');
        if (catList) {
            catList.innerHTML = cats.map(c => `
                <li class="list-group-item bg-transparent text-white border-bottom border-secondary py-2 d-flex justify-content-between align-items-center">
                    <span>${c}</span>
                    <button class="btn btn-sm text-danger p-0 ms-2" style="background:none; border:none;" onclick="adminDeleteCategory('${c.replace(/'/g, "\\'")}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </li>
            `).join('');
        }

        // 2. Render members ledger
        const tbody = document.getElementById('adminMembersTableBody');
        if (tbody) {
            tbody.innerHTML = members.map(m => {
                const isSelf = m.uid === currentUser.uid;
                const deleteBtn = isSelf ? 
                    `<span class="badge bg-secondary p-2">Current Admin</span>` : 
                    `<button class="btn btn-sm btn-danger p-1 px-2" onclick="adminDeleteMember('${m.uid}')"><i class="bi bi-trash"></i> Delete</button>`;
                
                return `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="profile-logo-wrap" style="width:30px; height:30px; border-radius:50%; overflow:hidden;">
                                    <img src="${m.logoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60'}" alt="" style="width:100%; height:100%; object-fit:cover;">
                                </div>
                                <div>
                                    <strong class="text-white">${m.name}</strong>
                                    <small class="text-secondary d-block">${m.email}</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <strong class="text-white">${m.companyName}</strong>
                            <span class="badge bg-primary d-block mt-1 badge-custom" style="width: fit-content; background-color: var(--rotary-blue) !important">${m.category}</span>
                        </td>
                        <td class="text-center">${deleteBtn}</td>
                    </tr>
                `;
            }).join('');
        }

        // Bind Add Category form
        const catForm = document.getElementById('adminAddCategoryForm');
        if (catForm) {
            catForm.onsubmit = async (e) => {
                e.preventDefault();
                const input = document.getElementById('adminNewCategoryInput');
                const newCat = input.value.trim();
                if (newCat) {
                    const added = await window.RotaryBizDB.addCategory(newCat);
                    if (added) {
                        alert("Category added successfully!");
                        input.value = '';
                        loadAdminData();
                        populateCategoryDropdowns();
                    } else {
                        alert("Category already exists.");
                    }
                }
            };
        }

        // Bind Add Member form
        const memForm = document.getElementById('adminAddMemberForm');
        if (memForm) {
            memForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('adminMemName').value;
                const mobile = document.getElementById('adminMemMobile').value;
                const category = document.getElementById('adminMemCategory').value;
                const company = document.getElementById('adminMemCompany').value;
                const email = document.getElementById('adminMemEmail').value;
                const password = document.getElementById('adminMemPassword').value || 'password123';
                const role = document.getElementById('adminMemRole').value;

                try {
                    const exists = members.some(m => m.email.toLowerCase() === email.trim().toLowerCase());
                    if (exists) {
                        alert("A member account with this email address already exists.");
                        return;
                    }
                    
                    const uid = 'member_' + Date.now();
                    const profile = {
                        uid,
                        name,
                        email: email.trim(),
                        mobile,
                        companyName: company,
                        category,
                        logoUrl: "",
                        description: "",
                        products: [],
                        services: [],
                        whatsapp: mobile.replace('+', '').replace(/\s+/g, ''),
                        address: "",
                        password: password,
                        role: role,
                        joinedAt: new Date().toISOString()
                    };

                    await window.RotaryBizDB.updateMemberProfile(uid, profile);
                    
                    const modalEl = document.getElementById('adminAddMemberModal');
                    const modalInst = bootstrap.Modal.getInstance(modalEl);
                    if (modalInst) {
                        modalInst.hide();
                    } else {
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.hide();
                    }
                    
                    memForm.reset();
                    alert("Member profile created successfully!");
                    loadAdminData();
                } catch (err) {
                    alert("Error creating member: " + err.message);
                }
            };
        }
        // 3. Render sponsors ledger
        const sponsors = await window.RotaryBizDB.getSponsors();
        const sponsorTbody = document.getElementById('adminSponsorsTableBody');
        if (sponsorTbody) {
            const today = new Date().toISOString().split('T')[0];
            sponsorTbody.innerHTML = sponsors.map(s => {
                let statusBadge = "";
                if (s.startDate && s.endDate) {
                    if (today < s.startDate) {
                        statusBadge = `<span class="badge bg-warning text-dark ms-1">Scheduled</span>`;
                    } else if (today > s.endDate) {
                        statusBadge = `<span class="badge bg-danger ms-1">Expired</span>`;
                    } else {
                        statusBadge = `<span class="badge bg-success ms-1">Active</span>`;
                    }
                } else {
                    statusBadge = `<span class="badge bg-success ms-1">Active</span>`;
                }

                const datesText = (s.startDate && s.endDate) ? 
                    `<div class="text-muted mt-1" style="font-size:0.7rem;"><i class="bi bi-calendar3"></i> ${s.startDate} to ${s.endDate}</div>` : 
                    `<div class="text-muted mt-1" style="font-size:0.7rem;"><i class="bi bi-calendar-check"></i> Always Active</div>`;

                return `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div style="width: 40px; height: 40px; border-radius: 4px; overflow: hidden; background-color: rgba(255,255,255,0.05); padding: 2px;">
                                    <img src="${s.imageUrl}" alt="" style="width: 100%; height: 100%; object-fit: contain;">
                                </div>
                                <div>
                                    <strong class="text-white">${s.name}</strong>
                                    ${statusBadge}
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="text-white small">${s.tagline}</div>
                            ${datesText}
                        </td>
                        <td><a href="${s.link}" target="_blank" class="text-info small text-truncate d-inline-block" style="max-width: 150px;">${s.link}</a></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-danger p-1 px-2" onclick="adminDeleteSponsor('${s.id}')"><i class="bi bi-trash"></i> Delete</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Bind Add Sponsor Ad form
        const sponsorForm = document.getElementById('adminAddSponsorForm');
        if (sponsorForm) {
            sponsorForm.onsubmit = async (e) => {
                e.preventDefault();
                const name = document.getElementById('adminSponsorName').value.trim();
                const tagline = document.getElementById('adminSponsorTagline').value.trim();
                const link = document.getElementById('adminSponsorLink').value.trim();
                const startDate = document.getElementById('adminSponsorStartDate').value;
                const endDate = document.getElementById('adminSponsorEndDate').value;
                const fileInput = document.getElementById('adminSponsorImage');
                
                let imageUrl = "";
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    imageUrl = await window.RotaryBizDB.uploadLogo(file);
                }

                try {
                    await window.RotaryBizDB.addSponsor({ name, tagline, link, imageUrl, startDate, endDate });
                    
                    const modalEl = document.getElementById('adminAddSponsorModal');
                    const modalInst = bootstrap.Modal.getInstance(modalEl) || bootstrap.Modal.getOrCreateInstance(modalEl);
                    modalInst.hide();
                    
                    sponsorForm.reset();
                    alert("Sponsor Ad added successfully!");
                    loadAdminData();
                } catch (err) {
                    alert("Error adding sponsor ad: " + err.message);
                }
            };
        }
    } catch (e) {
        console.error("Admin data loading failed", e);
    }
}

window.adminDeleteCategory = async function(cat) {
    if (confirm(`Are you sure you want to delete the category "${cat}"? This will not remove members of this category but will remove it from dropdown lists.`)) {
        await window.RotaryBizDB.deleteCategory(cat);
        loadAdminData();
        populateCategoryDropdowns();
    }
};

window.adminDeleteMember = async function(uid) {
    if (confirm("Are you sure you want to delete this member profile? This action is permanent and cannot be undone.")) {
        await window.RotaryBizDB.deleteMember(uid);
        loadAdminData();
    }
};

window.adminDeleteSponsor = async function(id) {
    if (confirm("Are you sure you want to delete this sponsor ad? This action is permanent and cannot be undone.")) {
        await window.RotaryBizDB.deleteSponsor(id);
        loadAdminData();
    }
};
