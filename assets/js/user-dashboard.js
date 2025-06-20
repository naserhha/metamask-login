document.addEventListener('DOMContentLoaded', function() {
    // Profile Picture Upload
    const profilePictureInput = document.createElement('input');
    profilePictureInput.type = 'file';
    profilePictureInput.accept = 'image/*';
    profilePictureInput.style.display = 'none';

    document.getElementById('change-picture').addEventListener('click', function() {
        profilePictureInput.click();
    });

    profilePictureInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                const img = document.querySelector('.profile-picture');
                img.src = e.target.result;

                // Upload the image
                const formData = new FormData();
                formData.append('action', 'update_profile_picture');
                formData.append('profile_picture', file);
                formData.append('nonce', metamaskLoginObj.nonce);

                fetch(metamaskLoginObj.ajaxurl, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        addActivity('profile', 'تصویر پروفایل به‌روزرسانی شد');
                    } else {
                        alert('خطا در به‌روزرسانی تصویر پروفایل');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('خطا در به‌روزرسانی تصویر پروفایل');
                });
            };

            reader.readAsDataURL(file);
        }
    });

    // Profile Update Form
    const profileForm = document.getElementById('profile-update-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            formData.append('action', 'update_profile');
            formData.append('nonce', document.getElementById('profile_nonce').value);

            fetch(metamaskLoginObj.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addActivity('profile', 'اطلاعات پروفایل به‌روزرسانی شد');
                    alert('پروفایل با موفقیت به‌روزرسانی شد');
                } else {
                    alert('خطا در به‌روزرسانی پروفایل');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('خطا در به‌روزرسانی پروفایل');
            });
        });
    }

    // Password Change
    document.getElementById('change-password').addEventListener('click', function() {
        const currentPassword = prompt('رمز عبور فعلی را وارد کنید:');
        if (!currentPassword) return;

        const newPassword = prompt('رمز عبور جدید را وارد کنید:');
        if (!newPassword) return;

        const confirmPassword = prompt('رمز عبور جدید را تأیید کنید:');
        if (newPassword !== confirmPassword) {
            alert('رمزهای عبور مطابقت ندارند');
            return;
        }

        const formData = new FormData();
        formData.append('action', 'change_password');
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);
        formData.append('nonce', metamaskLoginObj.nonce);

        fetch(metamaskLoginObj.ajaxurl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addActivity('security', 'رمز عبور تغییر کرد');
                alert('رمز عبور با موفقیت تغییر کرد');
            } else {
                alert(data.message || 'خطا در تغییر رمز عبور');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('خطا در تغییر رمز عبور');
        });
    });

    // Two-Factor Authentication
    const twoFactorToggle = document.getElementById('two-factor-toggle');
    if (twoFactorToggle) {
        twoFactorToggle.addEventListener('change', function() {
            const enabled = this.checked;
            const formData = new FormData();
            formData.append('action', 'toggle_two_factor');
            formData.append('enabled', enabled);
            formData.append('nonce', metamaskLoginObj.nonce);

            fetch(metamaskLoginObj.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addActivity('security', `احراز هویت دو مرحله‌ای ${enabled ? 'فعال شد' : 'غیرفعال شد'}`);
                    document.querySelector('.toggle-label').textContent = 
                        enabled ? 'فعال' : 'غیرفعال';
                } else {
                    this.checked = !enabled;
                    alert('خطا در به‌روزرسانی احراز هویت دو مرحله‌ای');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.checked = !enabled;
                alert('خطا در به‌روزرسانی احراز هویت دو مرحله‌ای');
            });
        });
    }

    // Privacy Settings
    const privacyForm = document.getElementById('privacy-settings-form');
    if (privacyForm) {
        privacyForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            formData.append('action', 'update_privacy_settings');
            formData.append('nonce', document.getElementById('privacy_nonce').value);

            fetch(metamaskLoginObj.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addActivity('privacy', 'تنظیمات حریم خصوصی به‌روزرسانی شد');
                    alert('تنظیمات حریم خصوصی با موفقیت به‌روزرسانی شد');
                } else {
                    alert('خطا در به‌روزرسانی تنظیمات حریم خصوصی');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('خطا در به‌روزرسانی تنظیمات حریم خصوصی');
            });
        });
    }

    // Activity Filters
    const activityTypeFilter = document.getElementById('activity-type-filter');
    const activityTimeFilter = document.getElementById('activity-time-filter');

    function filterActivities() {
        const type = activityTypeFilter.value;
        const time = parseInt(activityTimeFilter.value);
        const now = new Date().getTime();

        document.querySelectorAll('.activity-item').forEach(item => {
            const itemType = item.dataset.type;
            const itemTimestamp = parseInt(item.dataset.timestamp);
            const daysAgo = (now - itemTimestamp) / (1000 * 60 * 60 * 24);

            const typeMatch = type === 'all' || itemType === type;
            const timeMatch = daysAgo <= time;

            item.style.display = typeMatch && timeMatch ? 'flex' : 'none';
        });
    }

    if (activityTypeFilter && activityTimeFilter) {
        activityTypeFilter.addEventListener('change', filterActivities);
        activityTimeFilter.addEventListener('change', filterActivities);
    }

    // Navigation
    document.querySelectorAll('.dashboard-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            
            // Update active state
            document.querySelectorAll('.dashboard-nav li').forEach(li => {
                li.classList.remove('active');
            });
            this.parentElement.classList.add('active');

            // Show target section
            document.querySelectorAll('section').forEach(section => {
                section.style.display = 'none';
            });
            document.querySelector(`.${target}-section`).style.display = 'block';
        });
    });

    // Helper function to add activity
    function addActivity(type, description) {
        const activityList = document.querySelector('.activity-list');
        const now = new Date();
        const timestamp = now.getTime();
        
        const activity = {
            type: type,
            description: description,
            timestamp: timestamp,
            time_ago: 'هم اکنون',
            icon: getActivityIcon(type)
        };

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.dataset.type = type;
        activityItem.dataset.timestamp = timestamp;

        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-details">
                <p class="activity-description">${description}</p>
                <span class="activity-time">هم اکنون</span>
            </div>
        `;

        activityList.insertBefore(activityItem, activityList.firstChild);
    }

    // Helper function to get activity icon
    function getActivityIcon(type) {
        const icons = {
            'profile': 'fa-user-edit',
            'security': 'fa-shield-alt',
            'privacy': 'fa-lock',
            'login': 'fa-sign-in-alt',
            'wallet': 'fa-wallet'
        };
        return icons[type] || 'fa-info-circle';
    }

    // Initialize sections
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });
    document.querySelector('.profile-section').style.display = 'block';
}); 