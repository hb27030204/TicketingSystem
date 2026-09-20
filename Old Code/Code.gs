function doGet(e) {
  const page = e && e.parameter ? String(e.parameter.page || '') : '';

  if (page === 'staff') {
    return HtmlService
      .createHtmlOutputFromFile('Staff')
      .addMetaTag(
        'viewport',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      )
      .setTitle('Raz Dandya Nights — Staff Check-in');
  }

  if (page === 'checkin') {
    return HtmlService
      .createHtmlOutputFromFile('Checkin')
      .addMetaTag(
        'viewport',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      )
      .setTitle('Raz Dandya Nights — Ticket Check-in');
  }

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1.0, viewport-fit=cover'
    )
    .setTitle('Raz Dandya Nights by AK');
}


const CONFIG = {
  EVENT_NAME: 'Raz Dandya Nights by AK',
  CAPACITY_PER_DAY: 1000
};


const PRICES = {
  'Kids (<16) — ₹99': 99,
  'Adult — ₹499': 499,
  'Adult — ₹850 (2 Days)': 850,
  'Couple — ₹849 (1 Day)': 849,
  'Couple — ₹1,599 (2 Days)': 1599,
  'Group of 5 — ₹4,149 (2 Days)': 4149
};


const TICKET_HEADERS = [
  'Ticket Token',
  'QR Type',
  '17 Oct Check-in',
  '17 Oct Check-in Time',
  '18 Oct Check-in',
  '18 Oct Check-in Time',
  'Band Colour',
  'Checked-in By',
  'Ticket PDF Status',
  'WhatsApp Status',
  'Email Status'
];


// NEW — additional ticket/recovery information
const EXTRA_HEADERS = [
  'QR / Check-in URL',
  'Ticket Generated At',
  'Email Sent At',
  'Last Ticket Resent At',
  'Email Error'
];


const STAFF_SESSION_MINUTES = 30;

const DATE_17 = '17th October 2026';
const DATE_18 = '18th October 2026';


// NEW — server-side check-in controls
const CHECKIN_PROPERTY_17 = 'CHECK_IN_17_ENABLED';
const CHECKIN_PROPERTY_18 = 'CHECK_IN_18_ENABLED';


function ensureTicketColumns_(sheet) {

  const requiredColumns =
    12 +
    TICKET_HEADERS.length +
    EXTRA_HEADERS.length;

  if (sheet.getMaxColumns() < requiredColumns) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      requiredColumns - sheet.getMaxColumns()
    );
  }

  const headers = sheet
    .getRange(1, 1, 1, requiredColumns)
    .getValues()[0];

  // Existing ticket columns M:W
  TICKET_HEADERS.forEach(function(h, i) {
    const column = 13 + i;

    if (String(headers[12 + i] || '').trim() !== h) {
      sheet.getRange(1, column).setValue(h);
    }
  });

  // New columns X:AB
  EXTRA_HEADERS.forEach(function(h, i) {
    const column = 24 + i;

    if (String(headers[23 + i] || '').trim() !== h) {
      sheet.getRange(1, column).setValue(h);
    }
  });
}


function getBandColour_(ticketType) {

  const t = String(ticketType || '');

  if (t === 'Kids (<16) — ₹99') return 'Green';

  if (t.indexOf('Couple') !== -1) {
    return 'Pink / Red';
  }

  if (t === 'Adult — ₹499') {
    return 'Yellow';
  }

  if (
    t.indexOf('Adult — ₹850') !== -1 ||
    t.indexOf('Group of 5') !== -1
  ) {
    return 'Orange';
  }

  if (t.indexOf('Special Guest') !== -1) {
    return 'Purple';
  }

  return 'Yellow';
}


function getQrType_(ticketType) {

  const t = String(ticketType || '');

  return (
    t.indexOf('Couple') !== -1 ||
    t.indexOf('Group of 5') !== -1
  )
    ? 'GROUP'
    : 'NORMAL';
}


function generateTicketToken_() {
  return Utilities
    .getUuid()
    .replace(/-/g, '')
    .toUpperCase();
}


function normalizeTicketQrToken_(value) {

  let token = String(value || '')
    .trim()
    .toUpperCase();

  if (token.indexOf('RDN|') === 0) {
    token = String(
      token.split('|')[1] || ''
    )
      .trim()
      .toUpperCase();
  }

  if (!/^[A-F0-9]{32}$/.test(token)) {
    throw new Error('Invalid ticket QR.');
  }

  return token;
}


function buildTicketData_(row, ticketToken, qrType, bandColour) {

  const type = String(row[4] || '');

  // IMPORTANT:
  // Keep the same deployed URL and QR structure.
  const APP_URL =
    'https://script.google.com/macros/s/AKfycbxL-gqxmNd4iuEavHRnZuN1B56KDoC-dVKaYyYoWyo9k2xAVBCB3Z_YWMCSyrbXH-0btQ/exec';

  const checkinUrl =
    APP_URL +
    '?page=checkin&qr=' +
    encodeURIComponent(ticketToken) +
    (
      type.indexOf('2 Days') === -1
        ? '&date=' + encodeURIComponent(String(row[5] || ''))
        : ''
    );

  return {
    bookingId: String(row[0] || ''),
    name: String(row[1] || ''),
    phone: String(row[2] || ''),
    email: String(row[3] || ''),
    ticketType: type,
    eventDate: String(row[5] || ''),
    quantity: Number(row[6]) || 0,
    amount: Number(row[7]) || 0,
    paymentId: String(row[9] || ''),

    ticketToken: ticketToken,
    qrType: qrType,
    bandColour: bandColour,

    // Existing secure QR URL
    checkinUrl: checkinUrl,

    // NEW — ticket security text available to Index/email/PDF
    securityNote1: 'Each ticket is unique and cannot be copied.',
    securityNote2: 'An ID card is necessary to verify your Identity at the entrance.'
  };
}


function getOrdersSheet_() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName('Orders');

  if (!sheet) {
    throw new Error('Orders sheet not found.');
  }

  ensureTicketColumns_(sheet);

  return sheet;
}


function getPaidCounts_(sheet) {

  const data = sheet.getDataRange().getValues();

  let sold17 = 0;
  let sold18 = 0;

  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][10] || '').trim() !== 'PAID'
    ) {
      continue;
    }

    const type = String(data[i][4] || '');
    const qty = Number(data[i][6]) || 0;
    const date = String(data[i][5] || '');

    if (
      type.indexOf('2 Days') !== -1 ||
      date === DATE_17
    ) {
      sold17 += qty;
    }

    if (
      type.indexOf('2 Days') !== -1 ||
      date === DATE_18
    ) {
      sold18 += qty;
    }
  }

  return {
    sold17: sold17,
    sold18: sold18
  };
}


function createRazorpayOrder(booking) {

  if (!booking) {
    throw new Error('Booking data missing.');
  }

  const name = String(booking.name || '').trim();
  const phone = String(booking.phone || '').trim();
  const email = String(booking.email || '').trim();
  const ticketType = String(booking.ticketType || '').trim();
  const eventDate = String(booking.eventDate || '').trim();
  const quantity = Number(booking.quantity || 0);

  if (!name) {
    throw new Error('Name is required.');
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(
      'Please enter a valid 10-digit Indian mobile number.'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      'Please enter a valid email address.'
    );
  }

  if (!PRICES[ticketType]) {
    throw new Error(
      'Ticket type not recognized: ' + ticketType
    );
  }

  if (quantity < 1 || quantity > 30) {
    throw new Error(
      'Quantity must be between 1 and 30.'
    );
  }

  const isTwoDay =
    ticketType.indexOf('2 Days') !== -1;

  if (
    !isTwoDay &&
    eventDate !== DATE_17 &&
    eventDate !== DATE_18
  ) {
    throw new Error(
      'Please select a valid event date.'
    );
  }

  const sheet = getOrdersSheet_();

  const dates =
    isTwoDay
      ? [DATE_17, DATE_18]
      : [eventDate];

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const sold = getPaidCounts_(sheet);

    if (
      dates.indexOf(DATE_17) !== -1 &&
      sold.sold17 + quantity >
        CONFIG.CAPACITY_PER_DAY
    ) {
      throw new Error(
        DATE_17 +
        ' is full. Only ' +
        Math.max(
          0,
          CONFIG.CAPACITY_PER_DAY - sold.sold17
        ) +
        ' tickets remaining.'
      );
    }

    if (
      dates.indexOf(DATE_18) !== -1 &&
      sold.sold18 + quantity >
        CONFIG.CAPACITY_PER_DAY
    ) {
      throw new Error(
        DATE_18 +
        ' is full. Only ' +
        Math.max(
          0,
          CONFIG.CAPACITY_PER_DAY - sold.sold18
        ) +
        ' tickets remaining.'
      );
    }

    const bookingId =
      'RDN-' +
      Utilities
        .getUuid()
        .substring(0, 8)
        .toUpperCase();

    const props =
      PropertiesService.getScriptProperties();

    const keyId =
      props.getProperty('RAZORPAY_KEY_ID');

    const keySecret =
      props.getProperty('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error(
        'Razorpay keys not found in Script Properties.'
      );
    }

    const amount =
      PRICES[ticketType] * quantity;

    const response =
      UrlFetchApp.fetch(
        'https://api.razorpay.com/v1/orders',
        {
          method: 'post',

          headers: {
            Authorization:
              'Basic ' +
              Utilities.base64Encode(
                keyId + ':' + keySecret
              )
          },

          contentType: 'application/json',

          payload: JSON.stringify({
            amount: amount * 100,
            currency: 'INR',
            receipt: bookingId,

            notes: {
              event: CONFIG.EVENT_NAME,
              booking_id: bookingId,
              ticket_type: ticketType,
              event_date: eventDate,
              quantity: String(quantity)
            }
          }),

          muteHttpExceptions: true
        }
      );

    const code =
      response.getResponseCode();

    if (code < 200 || code >= 300) {
      throw new Error(
        'Unable to create Razorpay order.'
      );
    }

    const order =
      JSON.parse(
        response.getContentText()
      );

    if (!order.id) {
      throw new Error(
        'Razorpay did not return an order ID.'
      );
    }

    sheet.appendRow([
      bookingId,
      name,
      phone,
      email,
      ticketType,
      eventDate,
      quantity,
      amount,
      order.id,
      '',
      'PENDING',
      new Date()
    ]);

    return {
      success: true,
      keyId: keyId,
      razorpayOrderId: order.id,
      amount: amount * 100,
      bookingId: bookingId
    };

  } finally {
    lock.releaseLock();
  }
}


/*
========================================================
PAYMENT VERIFICATION
========================================================
*/

function verifyRazorpayPayment(paymentData) {

  if (!paymentData) {
    throw new Error(
      'Payment data missing.'
    );
  }

  const bookingId =
    String(
      paymentData.bookingId || ''
    ).trim();

  const paymentId =
    String(
      paymentData.razorpay_payment_id || ''
    ).trim();

  const clientOrderId =
    String(
      paymentData.razorpay_order_id || ''
    ).trim();

  const signature =
    String(
      paymentData.razorpay_signature || ''
    ).trim();

  if (
    !bookingId ||
    !paymentId ||
    !clientOrderId ||
    !signature
  ) {
    throw new Error(
      'Incomplete Razorpay payment information.'
    );
  }

  const sheet =
    getOrdersSheet_();

  const secret =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        'RAZORPAY_KEY_SECRET'
      );

  if (!secret) {
    throw new Error(
      'Razorpay secret key not found.'
    );
  }

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const data =
      sheet.getDataRange().getValues();

    let rowNumber = -1;

    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][0] || '').trim() ===
        bookingId
      ) {
        rowNumber = i + 1;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error(
        'Booking not found: ' + bookingId
      );
    }


    // NEW:
    // Read complete row including new X:AB columns.
    let row =
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          28
        )
        .getValues()[0];


    const storedOrderId =
      String(row[8] || '').trim();

    if (!storedOrderId) {
      throw new Error(
        'Razorpay Order ID missing from booking.'
      );
    }

    if (
      clientOrderId !== storedOrderId
    ) {
      throw new Error(
        'Razorpay Order ID mismatch.'
      );
    }


    const expected =
      Utilities
        .computeHmacSha256Signature(
          storedOrderId + '|' + paymentId,
          secret
        )
        .map(function(b) {
          return (
            '0' +
            (b & 255).toString(16)
          ).slice(-2);
        })
        .join('');


    if (
      expected.toLowerCase() !==
      signature.toLowerCase()
    ) {
      throw new Error(
        'Payment signature verification failed.'
      );
    }


    /*
    ======================================================
    ALREADY PAID
    ======================================================
    */

    if (
      String(row[10] || '').trim() ===
      'PAID'
    ) {

      let token =
        String(row[12] || '').trim();

      let qrType =
        String(row[13] || '').trim();

      let band =
        String(row[18] || '').trim();


      if (!token) {

        token =
          generateTicketToken_();

        qrType =
          qrType ||
          getQrType_(row[4]);

        band =
          band ||
          getBandColour_(row[4]);

        sheet
          .getRange(rowNumber, 13)
          .setValue(token);

        sheet
          .getRange(rowNumber, 14)
          .setValue(qrType);

        sheet
          .getRange(rowNumber, 19)
          .setValue(band);

        sheet
          .getRange(rowNumber, 21)
          .setValue('READY');

        row =
          sheet
            .getRange(
              rowNumber,
              1,
              1,
              28
            )
            .getValues()[0];
      }


      // NEW — save QR/check-in URL
      const ticket =
        buildTicketData_(
          row,
          token,
          qrType ||
            getQrType_(row[4]),
          band ||
            getBandColour_(row[4])
        );

      saveTicketUrl_(
        sheet,
        rowNumber,
        ticket.checkinUrl
      );


      // NEW — automatically email if not already sent
      if (
        String(row[22] || '').trim() !==
        'SENT'
      ) {
        try {
          sendTicketEmail_(
            row,
            ticket,
            rowNumber,
            sheet
          );
        } catch (emailError) {

          sheet
            .getRange(rowNumber, 28)
            .setValue(
              String(
                emailError &&
                emailError.message
                  ? emailError.message
                  : emailError
              )
            );
        }
      }


      return {
        success: true,
        alreadyPaid: true,
        bookingId: bookingId,
        ticket: ticket
      };
    }


    /*
    ======================================================
    FIRST SUCCESSFUL PAYMENT
    ======================================================
    */

    const ticketType =
      String(row[4] || '');

    const token =
      generateTicketToken_();

    const qrType =
      getQrType_(ticketType);

    const band =
      getBandColour_(ticketType);


    sheet
      .getRange(rowNumber, 10)
      .setValue(paymentId);

    sheet
      .getRange(rowNumber, 11)
      .setValue('PAID');

    sheet
      .getRange(rowNumber, 13)
      .setValue(token);

    sheet
      .getRange(rowNumber, 14)
      .setValue(qrType);

    sheet
      .getRange(rowNumber, 19)
      .setValue(band);

    sheet
      .getRange(rowNumber, 21)
      .setValue('READY');

    sheet
      .getRange(rowNumber, 22)
      .setValue('PENDING');

    sheet
      .getRange(rowNumber, 23)
      .setValue('PENDING');


    // NEW — ticket generated time
    sheet
      .getRange(rowNumber, 25)
      .setValue(new Date());


    row =
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          28
        )
        .getValues()[0];


    const ticket =
      buildTicketData_(
        row,
        token,
        qrType,
        band
      );


    // NEW — permanently save secure QR URL
    saveTicketUrl_(
      sheet,
      rowNumber,
      ticket.checkinUrl
    );


    /*
    ======================================================
    AUTOMATIC EMAIL
    ======================================================
    */

    try {

      sendTicketEmail_(
        row,
        ticket,
        rowNumber,
        sheet
      );

    } catch (emailError) {

      // IMPORTANT:
      // Payment remains successful even if email fails.

      sheet
        .getRange(rowNumber, 28)
        .setValue(
          String(
            emailError &&
            emailError.message
              ? emailError.message
              : emailError
          )
        );
    }


    return {
      success: true,
      alreadyPaid: false,
      bookingId: bookingId,
      ticket: ticket
    };

  } finally {
    lock.releaseLock();
  }
}


/*
========================================================
PAID TICKET
========================================================
*/

function getPaidTicket(bookingId) {

  bookingId =
    String(bookingId || '').trim();

  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    );
  }

  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][0] || '').trim() !==
      bookingId
    ) {
      continue;
    }

    if (
      String(data[i][10] || '').trim() !==
      'PAID'
    ) {
      throw new Error(
        'This booking is not paid.'
      );
    }

    const token =
      String(data[i][12] || '').trim();

    if (!token) {
      throw new Error(
        'Secure ticket token has not been created yet.'
      );
    }

    const ticket =
      buildTicketData_(
        data[i],
        token,
        String(data[i][13] || '').trim() ||
          getQrType_(data[i][4]),
        String(data[i][18] || '').trim() ||
          getBandColour_(data[i][4])
      );


    // NEW — make sure URL is stored
    saveTicketUrl_(
      sheet,
      i + 1,
      ticket.checkinUrl
    );


    return ticket;
  }

  throw new Error(
    'Booking not found: ' + bookingId
  );
}


/*
========================================================
STAFF LOGIN
========================================================
*/

function staffLogin(staffName, pin) {

  staffName =
    String(staffName || '').trim();

  pin =
    String(pin || '').trim();

  if (!staffName) {
    throw new Error(
      'Staff name is required.'
    );
  }

  if (!pin) {
    throw new Error(
      'Staff PIN is required.'
    );
  }

  const stored =
    PropertiesService
      .getScriptProperties()
      .getProperty('STAFF_PIN');

  if (!stored) {
    throw new Error(
      'STAFF_PIN is not configured in Script Properties.'
    );
  }

  if (pin !== stored) {
    throw new Error(
      'Incorrect staff PIN.'
    );
  }

  const sessionToken =
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');

  CacheService
    .getScriptCache()
    .put(
      'STAFF_SESSION_' + sessionToken,
      JSON.stringify({
        staffName: staffName
      }),
      STAFF_SESSION_MINUTES * 60
    );

  return {
    success: true,
    sessionToken: sessionToken,
    staffName: staffName,
    expiresInMinutes: STAFF_SESSION_MINUTES
  };
}


function requireStaffSession_(sessionToken) {

  sessionToken =
    String(sessionToken || '').trim();

  if (!sessionToken) {
    throw new Error(
      'Staff session expired. Please sign in again.'
    );
  }

  const key =
    'STAFF_SESSION_' + sessionToken;

  const raw =
    CacheService
      .getScriptCache()
      .get(key);

  if (!raw) {
    throw new Error(
      'Staff session expired. Please sign in again.'
    );
  }

  let session;

  try {
    session = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      'Invalid staff session.'
    );
  }

  if (!session.staffName) {
    throw new Error(
      'Invalid staff session.'
    );
  }

  CacheService
    .getScriptCache()
    .put(
      key,
      JSON.stringify(session),
      STAFF_SESSION_MINUTES * 60
    );

  return session;
}


function staffLogout(sessionToken) {

  sessionToken =
    String(sessionToken || '').trim();

  if (sessionToken) {
    CacheService
      .getScriptCache()
      .remove(
        'STAFF_SESSION_' + sessionToken
      );
  }

  return {
    success: true
  };
}


/*
========================================================
CHECK-IN DATE HELPERS
========================================================
*/

function getCheckInDate_(requestedDate) {

  requestedDate =
    String(requestedDate || '').trim();

  if (
    requestedDate !== DATE_17 &&
    requestedDate !== DATE_18
  ) {
    throw new Error(
      'Invalid event date.'
    );
  }

  return requestedDate;
}


function getCheckInColumns_(eventDate) {

  if (eventDate === DATE_17) {
    return {
      statusColumn: 15,
      timeColumn: 16
    };
  }

  if (eventDate === DATE_18) {
    return {
      statusColumn: 17,
      timeColumn: 18
    };
  }

  throw new Error(
    'Invalid event date.'
  );
}


function getTicketUnitSize_(ticketType) {

  const t =
    String(ticketType || '');

  if (
    t.indexOf('Group of 5') !== -1
  ) {
    return 5;
  }

  if (
    t.indexOf('Couple') !== -1
  ) {
    return 2;
  }

  return 1;
}


function getCheckinCount_(value, total) {

  const v =
    String(
      value == null ? '' : value
    )
      .trim()
      .toUpperCase();

  if (v === 'YES') {
    return total;
  }

  const n = Number(value);

  return (
    isFinite(n) && n > 0
      ? n
      : 0
  );
}


/*
========================================================
NEW — SERVER-SIDE CHECK-IN CONTROL
========================================================
*/

function isCheckInEnabled_(eventDate) {

  const props =
    PropertiesService
      .getScriptProperties();

  if (eventDate === DATE_17) {

    return (
      String(
        props.getProperty(
          CHECKIN_PROPERTY_17
        ) || 'false'
      ).toLowerCase() === 'true'
    );
  }

  if (eventDate === DATE_18) {

    return (
      String(
        props.getProperty(
          CHECKIN_PROPERTY_18
        ) || 'false'
      ).toLowerCase() === 'true'
    );
  }

  return false;
}


/*
Get current event check-in status.
Requires staff login.
*/

function getCheckInControl(sessionToken) {

  requireStaffSession_(sessionToken);

  return {
    success: true,

    date17: {
      date: DATE_17,
      enabled: isCheckInEnabled_(DATE_17)
    },

    date18: {
      date: DATE_18,
      enabled: isCheckInEnabled_(DATE_18)
    }
  };
}


/*
Turn check-in ON/OFF for a specific date.

This is server-side and requires a valid staff session.
*/

function setCheckInDateEnabled(
  sessionToken,
  eventDate,
  enabled
) {

  requireStaffSession_(sessionToken);

  const date =
    getCheckInDate_(eventDate);

  const value =
    Boolean(enabled);

  const props =
    PropertiesService
      .getScriptProperties();

  if (date === DATE_17) {

    props.setProperty(
      CHECKIN_PROPERTY_17,
      String(value)
    );

  } else if (date === DATE_18) {

    props.setProperty(
      CHECKIN_PROPERTY_18,
      String(value)
    );
  }

  return {
    success: true,
    date: date,
    enabled: value
  };
}


/*
========================================================
GET TICKET FOR CHECK-IN
========================================================
*/

function getTicketForCheckIn(
  sessionToken,
  ticketToken
) {

  const session =
    requireStaffSession_(sessionToken);

  const token =
    normalizeTicketQrToken_(ticketToken);

  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      String(row[12] || '')
        .trim()
        .toUpperCase() !== token
    ) {
      continue;
    }

    const status =
      String(row[10] || '')
        .trim()
        .toUpperCase();

    const ticketType =
      String(row[4] || '');

    const quantity =
      Number(row[6]) || 0;

    const unitSize =
      getTicketUnitSize_(ticketType);

    const totalGuests =
      quantity * unitSize;

    const isTwoDay =
      ticketType.indexOf('2 Days') !== -1;

    const purchasedDate =
      String(row[5] || '');


    if (status !== 'PAID') {

      return {
        success: true,
        result: 'NOT_PAID',
        message:
          'This ticket has not been marked as paid.',
        staffName: session.staffName
      };
    }


    const checked17 =
      getCheckinCount_(
        row[14],
        totalGuests
      );

    const checked18 =
      getCheckinCount_(
        row[16],
        totalGuests
      );


    return {
      success: true,
      result: 'READY',
      staffName: session.staffName,

      ticket: {
        bookingId:
          String(row[0] || ''),

        name:
          String(row[1] || ''),

        ticketType:
          ticketType,

        quantity:
          quantity,

        unitSize:
          unitSize,

        totalGuests:
          totalGuests,

        purchasedDate:
          purchasedDate,

        isTwoDay:
          isTwoDay,

        bandColour:
          String(
            row[18] ||
            getBandColour_(ticketType)
          ),

        qrType:
          String(
            row[13] ||
            getQrType_(ticketType)
          ),

        days: {

          date17: DATE_17,

          checked17:
            checked17,

          remaining17:
            Math.max(
              0,
              totalGuests - checked17
            ),

          complete17:
            checked17 >= totalGuests,

          enabled17:
            isCheckInEnabled_(DATE_17),

          date18: DATE_18,

          checked18:
            checked18,

          remaining18:
            Math.max(
              0,
              totalGuests - checked18
            ),

          complete18:
            checked18 >= totalGuests,

          enabled18:
            isCheckInEnabled_(DATE_18)
        }
      }
    };
  }


  return {
    success: false,
    result: 'INVALID',
    message:
      'Invalid ticket QR. No matching ticket was found.'
  };
}


/*
========================================================
VALIDATE + CHECK-IN
========================================================
*/

function validateAndCheckInTicket(
  sessionToken,
  ticketToken,
  eventDate,
  checkInQuantity
) {

  const session =
    requireStaffSession_(sessionToken);

  const token =
    normalizeTicketQrToken_(ticketToken);

  const checkInDate =
    getCheckInDate_(eventDate);

  const columns =
    getCheckInColumns_(checkInDate);


  /*
  NEW — HARD SERVER-SIDE GATE

  Even if someone bypasses the webpage,
  check-in cannot happen until the date
  has been enabled on the server.
  */

  if (!isCheckInEnabled_(checkInDate)) {

    return {
      success: false,
      result: 'CHECKIN_CLOSED',

      message:
        'Check-in is currently closed for ' +
        checkInDate +
        '. Please wait until check-in is opened.'
    };
  }


  const requested =
    Number(checkInQuantity);

  if (
    !isFinite(requested) ||
    requested < 1 ||
    Math.floor(requested) !== requested
  ) {
    throw new Error(
      'Please select a valid number of people.'
    );
  }


  const sheet =
    getOrdersSheet_();

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    // FINAL SERVER-SIDE CHECK: the date may have been closed
    // after the first gate but before the write.
    if (!isCheckInEnabled_(checkInDate)) {
      return {
        success: false,
        result: 'CHECKIN_CLOSED',
        message:
          'Check-in is currently closed for ' +
          checkInDate +
          '. Please wait until check-in is opened.'
      };
    }

    const data =
      sheet.getDataRange().getValues();

    let rowNumber = -1;
    let row = null;


    for (let i = 1; i < data.length; i++) {

      if (
        String(data[i][12] || '')
          .trim()
          .toUpperCase() === token
      ) {

        rowNumber = i + 1;
        row = data[i];

        break;
      }
    }


    if (rowNumber === -1) {

      return {
        success: false,
        result: 'INVALID',

        message:
          'Invalid ticket QR. No matching ticket was found.'
      };
    }


    if (
      String(row[10] || '')
        .trim()
        .toUpperCase() !== 'PAID'
    ) {

      return {
        success: false,
        result: 'NOT_PAID',

        message:
          'This ticket has not been marked as paid.'
      };
    }


    const ticketType =
      String(row[4] || '');

    const purchasedDate =
      String(row[5] || '');

    const isTwoDay =
      ticketType.indexOf('2 Days') !== -1;

    const unitSize =
      getTicketUnitSize_(ticketType);

    const totalGuests =
      (Number(row[6]) || 0) *
      unitSize;


    if (
      !isTwoDay &&
      purchasedDate !== checkInDate
    ) {

      return {
        success: false,
        result: 'WRONG_DATE',

        message:
          'This ticket is not valid for ' +
          checkInDate +
          '.',

        ticket: {
          name:
            String(row[1] || ''),

          ticketType:
            ticketType,

          totalGuests:
            totalGuests,

          bandColour:
            String(
              row[18] ||
              getBandColour_(ticketType)
            )
        }
      };
    }


    const existingRaw =
      sheet
        .getRange(
          rowNumber,
          columns.statusColumn
        )
        .getValue();

    const existing =
      getCheckinCount_(
        existingRaw,
        totalGuests
      );

    const remaining =
      Math.max(
        0,
        totalGuests - existing
      );


    if (remaining <= 0) {

      return {
        success: false,
        result: 'ALREADY_USED',

        message:
          'All ' +
          totalGuests +
          ' guest(s) have already been checked in for ' +
          checkInDate +
          '.',

        checkedInBy:
          String(
            sheet
              .getRange(rowNumber, 20)
              .getValue() || ''
          ),

        ticket: {
          name:
            String(row[1] || ''),

          ticketType:
            ticketType,

          quantity:
            Number(row[6]) || 0,

          totalGuests:
            totalGuests,

          checkedIn:
            existing,

          remaining:
            0,

          bandColour:
            String(
              row[18] ||
              getBandColour_(ticketType)
            )
        }
      };
    }


    if (requested > remaining) {

      return {
        success: false,
        result: 'TOO_MANY',

        message:
          'Only ' +
          remaining +
          ' guest(s) remain for ' +
          checkInDate +
          '.',

        ticket: {
          name:
            String(row[1] || ''),

          ticketType:
            ticketType,

          quantity:
            Number(row[6]) || 0,

          totalGuests:
            totalGuests,

          checkedIn:
            existing,

          remaining:
            remaining,

          bandColour:
            String(
              row[18] ||
              getBandColour_(ticketType)
            )
        }
      };
    }


    const newCount =
      existing + requested;


    sheet
      .getRange(
        rowNumber,
        columns.statusColumn
      )
      .setValue(newCount);


    sheet
      .getRange(
        rowNumber,
        columns.timeColumn
      )
      .setValue(new Date());


    sheet
      .getRange(
        rowNumber,
        20
      )
      .setValue(session.staffName);


    return {
      success: true,
      result: 'VALID',

      message:
        requested +
        ' guest(s) checked in successfully.',

      checkedInBy:
        session.staffName,

      checkInQuantity:
        requested,

      checkedIn:
        newCount,

      remaining:
        Math.max(
          0,
          totalGuests - newCount
        ),

      complete:
        newCount >= totalGuests,

      checkInDate:
        checkInDate,

      checkInTime:
        new Date().toISOString(),

      ticket: {

        name:
          String(row[1] || ''),

        ticketType:
          ticketType,

        quantity:
          Number(row[6]) || 0,

        totalGuests:
          totalGuests,

        checkedIn:
          newCount,

        remaining:
          Math.max(
            0,
            totalGuests - newCount
          ),

        bandColour:
          String(
            row[18] ||
            getBandColour_(ticketType)
          ),

        qrType:
          String(
            row[13] ||
            getQrType_(ticketType)
          )
      }
    };

  } finally {
    lock.releaseLock();
  }
}


/*
========================================================
STAFF HEALTH CHECK
========================================================
*/

function staffHealthCheck(sessionToken) {

  const session =
    requireStaffSession_(sessionToken);

  return {
    success: true,
    staffName: session.staffName,

    // Return string instead of raw Date object
    // to avoid Apps Script client serialization issues.
    serverTime:
      new Date().toISOString()
  };
}


/*
========================================================
CHECK-IN SUMMARY
========================================================
*/

function getCheckInSummary(sessionToken) {

  requireStaffSession_(sessionToken);

  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();

  let paid17 = 0;
  let paid18 = 0;
  let checked17 = 0;
  let checked18 = 0;


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][10] || '').trim() !==
      'PAID'
    ) {
      continue;
    }

    const type =
      String(data[i][4] || '');

    const qty =
      Number(data[i][6]) || 0;

    const date =
      String(data[i][5] || '');

    const twoDay =
      type.indexOf('2 Days') !== -1;


    if (
      twoDay ||
      date === DATE_17
    ) {
      paid17 += qty;
    }

    if (
      twoDay ||
      date === DATE_18
    ) {
      paid18 += qty;
    }


    // NEW:
    // Supports both old YES records and
    // new numeric partial check-in records.

    const unitSize =
      getTicketUnitSize_(type);

    const totalGuests =
      qty * unitSize;


    checked17 +=
      getCheckinCount_(
        data[i][14],
        totalGuests
      );

    checked18 +=
      getCheckinCount_(
        data[i][16],
        totalGuests
      );
  }


  return {
    paid17: paid17,
    paid18: paid18,

    checked17: checked17,
    checked18: checked18,

    capacity:
      CONFIG.CAPACITY_PER_DAY,

    checkIn17Enabled:
      isCheckInEnabled_(DATE_17),

    checkIn18Enabled:
      isCheckInEnabled_(DATE_18)
  };
}


/*
========================================================
NEW — SAVE QR / CHECK-IN URL
========================================================
*/

function saveTicketUrl_(
  sheet,
  rowNumber,
  checkinUrl
) {

  if (!checkinUrl) {
    return;
  }

  sheet
    .getRange(
      rowNumber,
      24
    )
    .setValue(checkinUrl);
}


/*
========================================================
NEW — QR IMAGE
========================================================
*/

function getQrImageBlob_(checkinUrl) {

  if (!checkinUrl) {
    throw new Error(
      'QR URL is missing.'
    );
  }

  const qrUrl =
    'https://quickchart.io/qr?size=500&margin=2&text=' +
    encodeURIComponent(checkinUrl);

  const response =
    UrlFetchApp.fetch(
      qrUrl,
      {
        muteHttpExceptions: true
      }
    );

  const code =
    response.getResponseCode();

  if (code < 200 || code >= 300) {
    throw new Error(
      'Unable to generate QR image.'
    );
  }

  return response.getBlob()
    .setName('RDN-' + Utilities.getUuid() + '.png');
}


/*
========================================================
NEW — HTML ESCAPE FOR EMAIL/PDF
========================================================
*/

function escapeHtmlServer_(value) {

  return String(
    value == null ? '' : value
  ).replace(
    /[&<>'"]/g,
    function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c];
    }
  );
}


/*
========================================================
NEW — CREATE TICKET PDF
========================================================

This creates a printable PDF containing:
- Booking information
- Ticket type
- Date
- Quantity
- Booking ID
- Secure QR
- Security instructions

The existing webpage ticket design is NOT changed by this.
========================================================
*/

function buildTicketPdf_(
  ticket,
  qrBlob
) {

  const qrBase64 =
    Utilities.base64Encode(
      qrBlob.getBytes()
    );

  const qrData =
    'data:image/png;base64,' +
    qrBase64;


  const dateLabel =
    ticket.ticketType.indexOf('2 Days') !== -1
      ? '17 & 18 October 2026'
      : ticket.eventDate;


  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

body {
  font-family: Arial, sans-serif;
  background: #111;
  color: #222;
  margin: 0;
  padding: 30px;
}

.ticket {
  width: 720px;
  margin: auto;
  background: #f5eedf;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #c9b99f;
}

.header {
  background: #111;
  color: #fff;
  padding: 25px;
  text-align: center;
}

.header h1 {
  margin: 0;
  font-size: 28px;
}

.header p {
  margin: 7px 0 0;
  color: #d7ad52;
  font-size: 13px;
}

.body {
  display: flex;
  padding: 25px;
}

.qr-section {
  width: 240px;
  text-align: center;
}

.qr {
  background: #fff;
  padding: 10px;
  width: 210px;
  height: 210px;
}

.qr img {
  width: 210px;
  height: 210px;
}

.scan {
  margin-top: 10px;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.details {
  padding: 5px 20px;
  flex: 1;
}

.label {
  font-size: 9px;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 15px;
}

.value {
  font-size: 15px;
  font-weight: bold;
  margin-top: 4px;
}

.booking {
  font-family: monospace;
  font-size: 14px;
  color: #8c6424;
}

.security {
  border-top: 1px dashed #aaa;
  margin: 20px 25px 0;
  padding: 18px 0 25px;
  font-size: 10px;
  line-height: 1.7;
  color: #555;
}

.security b {
  color: #222;
}

</style>
</head>

<body>

<div class="ticket">

  <div class="header">
    <h1>Raz Dandya Nights by AK</h1>
    <p>${escapeHtmlServer_(dateLabel)}</p>
  </div>

  <div class="body">

    <div class="qr-section">
      <div class="qr">
        <img src="${qrData}">
      </div>

      <div class="scan">
        Scan at entry
      </div>
    </div>

    <div class="details">

      <div class="label">Guest</div>
      <div class="value">
        ${escapeHtmlServer_(ticket.name)}
      </div>

      <div class="label">Ticket</div>
      <div class="value">
        ${escapeHtmlServer_(ticket.ticketType)}
      </div>

      <div class="label">Valid Date</div>
      <div class="value">
        ${escapeHtmlServer_(dateLabel)}
      </div>

      <div class="label">Quantity</div>
      <div class="value">
        ${Number(ticket.quantity || 0)}
      </div>

      <div class="label">Booking ID</div>
      <div class="value booking">
        ${escapeHtmlServer_(ticket.bookingId)}
      </div>

      <div class="label">Wristband</div>
      <div class="value">
        ${escapeHtmlServer_(ticket.bandColour || 'Standard')}
      </div>

    </div>

  </div>

  <div class="security">
    <b>Each ticket is unique and cannot be copied.</b><br>
    An ID card is necessary to verify your Identity at the entrance.<br>
    Keep this QR code available for entry. Do not share the ticket publicly.
  </div>

</div>

</body>
</html>
`;


  const output =
    HtmlService
      .createHtmlOutput(html)
      .setWidth(900)
      .setHeight(700);


  return output
    .getBlob()
    .getAs(MimeType.PDF)
    .setName(
      'Raz-Dandya-Nights-Ticket-' +
      ticket.bookingId +
      '.pdf'
    );
}


/*
========================================================
NEW — AUTOMATIC TICKET EMAIL
========================================================
*/

function sendTicketEmail_(
  row,
  ticket,
  rowNumber,
  sheet
) {

  const email =
    String(ticket.email || '').trim();

  if (!email) {
    throw new Error(
      'Customer email address is missing.'
    );
  }


  const qrBlob =
    getQrImageBlob_(
      ticket.checkinUrl
    );


  const pdfBlob =
    buildTicketPdf_(
      ticket,
      qrBlob
    );


  const dateLabel =
    ticket.ticketType.indexOf('2 Days') !== -1
      ? '17 & 18 October 2026'
      : ticket.eventDate;


  const subject =
    'Your Raz Dandya Nights by AK Ticket — ' +
    ticket.bookingId;


  const body =
    'Hello ' +
    ticket.name +
    ',\n\n' +

    'Thank you for booking Raz Dandya Nights by AK.\n\n' +

    'Your ticket details:\n' +
    'Booking ID: ' +
    ticket.bookingId +
    '\n' +

    'Ticket: ' +
    ticket.ticketType +
    '\n' +

    'Date: ' +
    dateLabel +
    '\n' +

    'Quantity: ' +
    ticket.quantity +
    '\n\n' +

    'Your digital ticket is attached to this email as a PDF.\n\n' +

    'Important:\n' +
    'Each ticket is unique and cannot be copied.\n' +
    'An ID card is necessary to verify your Identity at the entrance.\n\n' +

    'Please save the ticket and keep the QR code available for entry.\n' +
    'Do not share your ticket publicly.\n\n' +

    'Raz Dandya Nights by AK';


  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    attachments: [pdfBlob],
    name: CONFIG.EVENT_NAME
  });


  /*
  Email successfully sent.
  */

  sheet
    .getRange(rowNumber, 23)
    .setValue('SENT');

  sheet
    .getRange(rowNumber, 26)
    .setValue(new Date());

  sheet
    .getRange(rowNumber, 28)
    .clearContent();


  return {
    success: true,
    email: email,
    bookingId: ticket.bookingId
  };
}


/*
========================================================
NEW — RESEND TICKET EMAIL
========================================================

Uses the SAME ticket token and SAME QR URL.
It does NOT create a new ticket.
========================================================
*/

function resendTicketEmail(bookingId) {

  bookingId =
    String(bookingId || '').trim();

  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    );
  }

  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][0] || '').trim() !==
      bookingId
    ) {
      continue;
    }


    if (
      String(data[i][10] || '')
        .trim()
        .toUpperCase() !== 'PAID'
    ) {
      throw new Error(
        'This booking is not paid.'
      );
    }


    const token =
      String(data[i][12] || '').trim();

    if (!token) {
      throw new Error(
        'This booking does not have a secure ticket token.'
      );
    }


    const ticket =
      buildTicketData_(
        data[i],
        token,
        String(data[i][13] || '').trim() ||
          getQrType_(data[i][4]),
        String(data[i][18] || '').trim() ||
          getBandColour_(data[i][4])
      );


    // Save the same QR URL
    saveTicketUrl_(
      sheet,
      i + 1,
      ticket.checkinUrl
    );


    try {

      sendTicketEmail_(
        data[i],
        ticket,
        i + 1,
        sheet
      );

      sheet
        .getRange(i + 1, 27)
        .setValue(new Date());


      return {
        success: true,
        bookingId: bookingId,
        email: ticket.email,
        message:
          'Ticket email sent successfully.'
      };

    } catch (error) {

      sheet
        .getRange(i + 1, 28)
        .setValue(
          String(
            error &&
            error.message
              ? error.message
              : error
          )
        );

      throw error;
    }
  }


  throw new Error(
    'Booking not found: ' + bookingId
  );
}


/*
========================================================
NEW — FIND BOOKING
========================================================

Admin/recovery backend.

Can search using:
- Booking ID
- Phone
- Email
========================================================
*/

function findBooking(
  bookingId,
  phone,
  email
) {

  bookingId =
    String(bookingId || '')
      .trim()
      .toUpperCase();

  phone =
    String(phone || '').trim();

  email =
    String(email || '')
      .trim()
      .toLowerCase();


  if (
    !bookingId &&
    !phone &&
    !email
  ) {
    throw new Error(
      'Enter Booking ID, phone number, or email.'
    );
  }


  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();

  const results = [];


  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const rowBookingId =
      String(row[0] || '')
        .trim()
        .toUpperCase();

    const rowPhone =
      String(row[2] || '')
        .trim();

    const rowEmail =
      String(row[3] || '')
        .trim()
        .toLowerCase();


    let matched = false;


    if (
      bookingId &&
      rowBookingId === bookingId
    ) {
      matched = true;
    }


    if (
      phone &&
      rowPhone === phone
    ) {
      matched = true;
    }


    if (
      email &&
      rowEmail === email
    ) {
      matched = true;
    }


    if (!matched) {
      continue;
    }


    results.push({
      bookingId:
        String(row[0] || ''),

      name:
        String(row[1] || ''),

      phone:
        String(row[2] || ''),

      email:
        String(row[3] || ''),

      ticketType:
        String(row[4] || ''),

      eventDate:
        String(row[5] || ''),

      quantity:
        Number(row[6]) || 0,

      amount:
        Number(row[7]) || 0,

      paymentId:
        String(row[9] || ''),

      status:
        String(row[10] || ''),

      ticketToken:
        String(row[12] || ''),

      qrType:
        String(row[13] || ''),

      bandColour:
        String(row[18] || ''),

      ticketPdfStatus:
        String(row[20] || ''),

      whatsappStatus:
        String(row[21] || ''),

      emailStatus:
        String(row[22] || ''),

      qrCheckinUrl:
        String(row[23] || ''),

      ticketGeneratedAt:
        row[24]
          ? String(row[24])
          : '',

      emailSentAt:
        row[25]
          ? String(row[25])
          : '',

      lastTicketResentAt:
        row[26]
          ? String(row[26])
          : '',

      emailError:
        String(row[27] || '')
    });
  }


  return {
    success: true,
    count: results.length,
    bookings: results
  };
}


/*
========================================================
NEW — RECOVER TICKET DATA
========================================================

Returns the original ticket.
No new token is generated.
========================================================
*/

function recoverTicket(bookingId) {

  bookingId =
    String(bookingId || '').trim();

  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    );
  }


  const sheet =
    getOrdersSheet_();

  const data =
    sheet.getDataRange().getValues();


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][0] || '').trim() !==
      bookingId
    ) {
      continue;
    }


    if (
      String(data[i][10] || '')
        .trim()
        .toUpperCase() !== 'PAID'
    ) {
      throw new Error(
        'This booking is not paid.'
      );
    }


    const token =
      String(data[i][12] || '').trim();

    if (!token) {
      throw new Error(
        'Secure ticket token is missing.'
      );
    }


    const ticket =
      buildTicketData_(
        data[i],
        token,
        String(data[i][13] || '').trim() ||
          getQrType_(data[i][4]),
        String(data[i][18] || '').trim() ||
          getBandColour_(data[i][4])
      );


    // Make sure URL exists in spreadsheet.
    saveTicketUrl_(
      sheet,
      i + 1,
      ticket.checkinUrl
    );


    return {
      success: true,
      ticket: ticket
    };
  }


  throw new Error(
    'Booking not found: ' + bookingId
  );
}


/*
========================================================
RAZORPAY TEST
========================================================
*/

function testRazorpayConnection() {

  const props =
    PropertiesService
      .getScriptProperties();

  const keyId =
    props.getProperty(
      'RAZORPAY_KEY_ID'
    );

  const keySecret =
    props.getProperty(
      'RAZORPAY_KEY_SECRET'
    );

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay keys not found.'
    );
  }


  const response =
    UrlFetchApp.fetch(
      'https://api.razorpay.com/v1/orders',
      {
        method: 'post',

        headers: {
          Authorization:
            'Basic ' +
            Utilities.base64Encode(
              keyId + ':' + keySecret
            )
        },

        contentType: 'application/json',

        payload: JSON.stringify({
          amount: 100,
          currency: 'INR',
          receipt: 'RDN-TEST-001'
        }),

        muteHttpExceptions: true
      }
    );


  Logger.log(
    response.getContentText()
  );
}


/*
========================================================
BOOKING TEST
========================================================
*/

function testCreateBooking() {

  const result =
    createRazorpayOrder({
      name: 'Test User',
      phone: '9876543210',
      email: 'test@example.com',
      ticketType: 'Adult — ₹499',
      eventDate: DATE_17,
      quantity: 1
    });

  Logger.log(
    JSON.stringify(result)
  );
}