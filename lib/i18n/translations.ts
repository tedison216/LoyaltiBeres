export type Language = 'en' | 'id'

export const translations = {
  en: {
    // Common
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    page: 'Page',
    of: 'of',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    phone: 'Phone',
    email: 'Email',
    password: 'Password',
    pin: 'PIN',
    
    // Customer
    customers: 'Customers',
    customer: 'Customer',
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    deleteCustomer: 'Delete Customer',
    customerName: 'Customer Name',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    totalMembers: 'total members',
    memberSince: 'Member Since',
    
    // Points/Stamps
    points: 'Points',
    stamps: 'Stamps',
    balance: 'Balance',
    adjustPoints: 'Adjust Points',
    adjustStamps: 'Adjust Stamps',
    currentBalance: 'Current',
    newBalance: 'New balance will be',
    addPoints: 'Add',
    subtractPoints: 'Subtract',
    amount: 'Amount',
    
    // Transactions
    transactions: 'Transactions',
    transaction: 'Transaction',
    addTransaction: 'Add Transaction',
    cancelTransaction: 'Cancel Transaction',
    transactionAmount: 'Transaction Amount',
    today: 'Today',
    older: 'Older',
    cancelled: 'Cancelled',
    active: 'Active',
    filterByDate: 'Filter by date',
    clear: 'Clear',
    noTransactions: 'No transactions yet',
    addFirstTransaction: 'Add First Transaction',
    customerWillEarn: 'Customer will earn',
    
    // Redemptions
    redemptions: 'Redemptions',
    redemption: 'Redemption',
    redemptionCode: 'Redemption Code',
    verify: 'Verify',
    pending: 'Pending',
    verified: 'Verified',
    noRedemptions: 'No redemptions found',
    verifyRedemption: 'Verify Redemption',
    
    // Rewards
    rewards: 'Rewards',
    reward: 'Reward',
    addReward: 'Add Reward',
    editReward: 'Edit Reward',
    rewardTitle: 'Reward Title',
    description: 'Description',
    requiredPoints: 'Required Points',
    requiredStamps: 'Required Stamps',
    
    // Promotions
    promotions: 'Promotions',
    promotion: 'Promotion',
    
    // Settings
    settings: 'Settings',
    restaurantSettings: 'Restaurant Settings',
    restaurantName: 'Restaurant Name',
    loyaltyMode: 'Loyalty Mode',
    stampMode: 'Stamp Mode',
    pointsMode: 'Points Mode',
    
    // Data Export
    dataExport: 'Data Export',
    exportData: 'Export Data',
    exportCustomers: 'Export Customers',
    exportTransactions: 'Export Transactions',
    exportRedemptions: 'Export Redemptions',
    downloadCSV: 'Download CSV',
    massDelete: 'Mass Delete',
    deleteOldData: 'Delete Old Data',
    selectDateRange: 'Select Date Range',
    deleteDataOlderThan: 'Delete data older than',
    
    // Analytics
    analytics: 'Analytics',
    weeklyActiveCustomers: 'Weekly Active Customers',
    pointsIssued: 'Points Issued',
    pointsRedeemed: 'Points Redeemed',
    topRewards: 'Top Rewards',
    
    // Activity Log
    activityLog: 'Activity Log',
    action: 'Action',
    performedBy: 'Performed By',
    timestamp: 'Timestamp',
    details: 'Details',
    
    // Messages
    success: 'Success',
    error: 'Error',
    confirmDelete: 'Are you sure you want to delete',
    cannotUndo: 'This action cannot be undone',
    updated: 'updated successfully',
    deleted: 'deleted successfully',
    added: 'added successfully',
  },
  id: {
    // Common
    loading: 'Memuat...',
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    edit: 'Ubah',
    add: 'Tambah',
    search: 'Cari',
    confirm: 'Konfirmasi',
    back: 'Kembali',
    next: 'Berikutnya',
    previous: 'Sebelumnya',
    page: 'Halaman',
    of: 'dari',
    
    // Auth
    login: 'Masuk',
    logout: 'Keluar',
    phone: 'Telepon',
    email: 'Email',
    password: 'Kata Sandi',
    pin: 'PIN',
    
    // Customer
    customers: 'Pelanggan',
    customer: 'Pelanggan',
    addCustomer: 'Tambah Pelanggan',
    editCustomer: 'Ubah Pelanggan',
    deleteCustomer: 'Hapus Pelanggan',
    customerName: 'Nama Pelanggan',
    fullName: 'Nama Lengkap',
    phoneNumber: 'Nomor Telepon',
    totalMembers: 'total anggota',
    memberSince: 'Anggota Sejak',
    
    // Points/Stamps
    points: 'Poin',
    stamps: 'Stempel',
    balance: 'Saldo',
    adjustPoints: 'Sesuaikan Poin',
    adjustStamps: 'Sesuaikan Stempel',
    currentBalance: 'Saat Ini',
    newBalance: 'Saldo baru akan menjadi',
    addPoints: 'Tambah',
    subtractPoints: 'Kurangi',
    amount: 'Jumlah',
    
    // Transactions
    transactions: 'Transaksi',
    transaction: 'Transaksi',
    addTransaction: 'Tambah Transaksi',
    cancelTransaction: 'Batalkan Transaksi',
    transactionAmount: 'Jumlah Transaksi',
    today: 'Hari Ini',
    older: 'Lebih Lama',
    cancelled: 'Dibatalkan',
    active: 'Aktif',
    filterByDate: 'Filter berdasarkan tanggal',
    clear: 'Hapus',
    noTransactions: 'Belum ada transaksi',
    addFirstTransaction: 'Tambah Transaksi Pertama',
    customerWillEarn: 'Pelanggan akan mendapat',
    
    // Redemptions
    redemptions: 'Penukaran',
    redemption: 'Penukaran',
    redemptionCode: 'Kode Penukaran',
    verify: 'Verifikasi',
    pending: 'Menunggu',
    verified: 'Terverifikasi',
    noRedemptions: 'Tidak ada penukaran',
    verifyRedemption: 'Verifikasi Penukaran',
    
    // Rewards
    rewards: 'Hadiah',
    reward: 'Hadiah',
    addReward: 'Tambah Hadiah',
    editReward: 'Ubah Hadiah',
    rewardTitle: 'Judul Hadiah',
    description: 'Deskripsi',
    requiredPoints: 'Poin yang Diperlukan',
    requiredStamps: 'Stempel yang Diperlukan',
    
    // Promotions
    promotions: 'Promosi',
    promotion: 'Promosi',
    
    // Settings
    settings: 'Pengaturan',
    restaurantSettings: 'Pengaturan Restoran',
    restaurantName: 'Nama Restoran',
    loyaltyMode: 'Mode Loyalitas',
    stampMode: 'Mode Stempel',
    pointsMode: 'Mode Poin',
    
    // Data Export
    dataExport: 'Ekspor Data',
    exportData: 'Ekspor Data',
    exportCustomers: 'Ekspor Pelanggan',
    exportTransactions: 'Ekspor Transaksi',
    exportRedemptions: 'Ekspor Penukaran',
    downloadCSV: 'Unduh CSV',
    massDelete: 'Hapus Massal',
    deleteOldData: 'Hapus Data Lama',
    selectDateRange: 'Pilih Rentang Tanggal',
    deleteDataOlderThan: 'Hapus data lebih lama dari',
    
    // Analytics
    analytics: 'Analitik',
    weeklyActiveCustomers: 'Pelanggan Aktif Mingguan',
    pointsIssued: 'Poin Diterbitkan',
    pointsRedeemed: 'Poin Ditukar',
    topRewards: 'Hadiah Teratas',
    
    // Activity Log
    activityLog: 'Log Aktivitas',
    action: 'Aksi',
    performedBy: 'Dilakukan Oleh',
    timestamp: 'Waktu',
    details: 'Detail',
    
    // Messages
    success: 'Berhasil',
    error: 'Kesalahan',
    confirmDelete: 'Apakah Anda yakin ingin menghapus',
    cannotUndo: 'Tindakan ini tidak dapat dibatalkan',
    updated: 'berhasil diperbarui',
    deleted: 'berhasil dihapus',
    added: 'berhasil ditambahkan',
  },
}

export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: keyof typeof translations.en): string => {
      return translations[lang][key] || translations.en[key] || key
    },
    lang,
  }
}
