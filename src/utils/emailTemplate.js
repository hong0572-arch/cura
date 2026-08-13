export const generateProposalHtml = (formData, t, pricing) => {
  const { 
    serviceType, date, passengers, firstName, lastName
  } = formData;
  
  const { 
    totalUsd, ccFeeUsd, baseFeeUsd, totalKrw, vehicleUsd, 
    extraPassUsd, extraLugUsd, porterUsd, surcharges, bookingId 
  } = pricing;
  const estimatedTotal = totalUsd;
  const subtotal = totalUsd - ccFeeUsd;

  const airportName = 'Incheon International Airport (ICN)';
  const serviceName = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
  const refCode = `BTG-Q-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Format the inclusions based on service type
  let inclusions = [];
  if (serviceType === 'arrival') {
    inclusions = [
      'Personal greeting at the arrival air-bridge by your Beyond the Gate agent with a name-board welcome',
      'Fast-track immigration through priority lanes (where available)',
      'Baggage assistance: Escort will assist with baggage retrieval and guide you to your vehicle.',
      'Customs clearance & escort assistance',
      'Escort all the way to your driver, hotel shuttle, or curbside pick-up point',
      'Real-time flight monitoring — we wait for you, even if you are delayed'
    ];
  } else if (serviceType === 'departure') {
    inclusions = [
      'Personal greeting at the departure floor by your Beyond the Gate agent with a name-board welcome',
      'Fast-track immigration through priority lanes (where available)',
      'Baggage assistance: Escort will assist with baggage retrieval and guide you from your vehicle.',
      'Customs clearance & escort assistance',
      'Escort all the way to your flight',
      'Real-time flight monitoring — we wait for you, even if you are delayed'
    ];
  } else {
    inclusions = [
      'Personal greeting by your Beyond the Gate agent with a name-board welcome',
      'Dedicated assistance throughout the airport',
      'Baggage handling and escort assistance',
      'Fast-track access where applicable'
    ];
  }

  // Translation fallbacks
  const greeting = `Good day ${firstName || ''},`;
  const intro = `Thank you for reaching out to <strong>Beyond the Gate</strong>. It's a pleasure to prepare your VIP airport service quote for <strong>${airportName}</strong>.`;
  const intro2 = `Below you'll find the full details of your request, exactly what your service includes, and a transparent breakdown of your VIP package. Our concierge team is standing by to finalise everything the moment you're ready.`;

  const inclusionsHtml = inclusions.map(item => `
    <div style="display: flex; margin-bottom: 16px;">
      <div style="color: #c9a050; margin-right: 12px; font-size: 18px;">✦</div>
      <div style="color: #444; font-size: 15px; line-height: 1.5;">${item}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Personalised Proposal</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #0b192c; color: #ffffff; padding: 40px 20px; text-align: center; }
        .header-brand { color: #c9a050; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; font-weight: 600; }
        .header-title { font-size: 32px; font-weight: normal; margin: 0 0 24px 0; font-family: Georgia, serif; }
        .header-ref { font-size: 12px; color: #a0aab5; }
        .header-divider { width: 40px; height: 2px; background-color: #c9a050; margin: 0 auto 24px auto; }
        
        .content { padding: 40px 30px; }
        .intro-text { font-size: 15px; color: #4a5568; margin-bottom: 40px; }
        
        .section-title { color: #c9a050; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        
        .request-box { background-color: #fcf9f2; border-radius: 8px; padding: 24px; margin-bottom: 40px; border-left: 4px solid #c9a050; }
        .request-row { display: flex; margin-bottom: 12px; font-size: 14px; }
        .request-row:last-child { margin-bottom: 0; }
        .request-label { width: 120px; color: #888; }
        .request-value { font-weight: 600; color: #2d3748; flex: 1; }
        
        .package-title { font-size: 22px; font-family: Georgia, serif; color: #1a202c; margin-bottom: 8px; }
        .package-subtitle { font-size: 14px; font-style: italic; color: #718096; margin-bottom: 24px; }
        
        .pricing-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-top: 20px; }
        .price-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; color: #4a5568; }
        .price-row-total { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid #1a202c; font-size: 18px; font-weight: bold; color: #1a202c; }
        .price-note { font-size: 12px; color: #a0aec0; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-brand">BEYOND THE GATE · GLOBAL VIP AIRPORT CONCIERGE</div>
          <h1 class="header-title">Your personalised proposal</h1>
          <div class="header-divider"></div>
          <div class="header-ref">Ref · ${refCode}</div>
        </div>
        
        <!-- Content -->
        <div class="content">
          <div class="intro-text">
            <p>${greeting}</p>
            <p>${intro}</p>
            <p>${intro2}</p>
          </div>
          
          <!-- 01. Your Request -->
          <div class="section-title">01 · YOUR REQUEST</div>
          <div class="request-box">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
              <tr>
                <td style="width: 120px; color: #888; padding-bottom: 12px;">Airport</td>
                <td style="font-weight: 600; color: #2d3748; padding-bottom: 12px;">${airportName}</td>
              </tr>
              <tr>
                <td style="color: #888; padding-bottom: 12px;">Service type</td>
                <td style="font-weight: 600; color: #2d3748; padding-bottom: 12px;">${serviceName}</td>
              </tr>
              <tr>
                <td style="color: #888; padding-bottom: 12px;">Service date</td>
                <td style="font-weight: 600; color: #2d3748; padding-bottom: 12px;">${date}</td>
              </tr>
              <tr>
                <td style="color: #888;">Travellers</td>
                <td style="font-weight: 600; color: #2d3748;">${passengers} ${passengers > 1 ? 'adults' : 'adult'}</td>
              </tr>
            </table>
          </div>
          
          <!-- 02. Inclusions -->
          <div class="section-title">02 · YOUR VIP PACKAGE INCLUSIONS</div>
          <h2 class="package-title">VIP ${serviceName} — Personal Meet & Greet</h2>
          <div class="package-subtitle">From the moment you land to your waiting driver — we handle every step so you walk out fresh, not frustrated.</div>
          
          <div style="margin-bottom: 40px;">
            ${inclusionsHtml}
          </div>
          
          <!-- 03. Pricing -->
          <div class="section-title">03 · YOUR VIP PACKAGE</div>
          <div class="pricing-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 15px; color: #4a5568;">
              <div>VIP Service — ${passengers} ${passengers > 1 ? 'adults' : 'adult'}</div>
              <div>$${subtotal.toFixed(2)}</div>
            </div>
            <div style="font-size: 12px; color: #a0aec0; margin-bottom: 16px;">$${subtotal.toFixed(2)}</div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 15px; color: #4a5568;">
              <div>Credit Card Fee (4%)</div>
              <div>$${ccFeeUsd.toFixed(2)}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid #1a202c; font-size: 18px; font-weight: bold; color: #1a202c;">
              <div>Estimated total</div>
              <div>$${estimatedTotal.toFixed(2)}</div>
            </div>
            
            <div class="price-note">
              Children aged 0–7 travel complimentary. Final total is confirmed at secure checkout.
            </div>
          </div>
          <!-- 04. Comprehensive Summary -->
          <div class="section-title">04 · COMPREHENSIVE BOOKING SUMMARY</div>
          <div class="pricing-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <pre style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #4a5568; white-space: pre-wrap; line-height: 1.5; margin: 0;">
[Reservation Details]
- Reference Ticket ID: ${bookingId}
- Service Date & Time: ${date}
- Service Type: ${serviceType.toUpperCase()}
- Flight: ${formData.airline || ''} ${formData.flightNumber || ''}

[Client Info]
- Name: ${firstName} ${lastName}
- Email: <a href="mailto:${formData.email}" style="color: #c9a050;">${formData.email}</a>
- Phone: ${formData.phone || ''}

[Service Configuration]
- Selected Chauffeur Vehicle: ${formData.vehicleType ? formData.vehicleType.toUpperCase() : 'NONE'}
- Passengers Count: ${passengers}
- Checked Luggage Count: ${formData.luggageCount || 0}

[Pricing Breakdown]
- Base Assist Fee: $${baseFeeUsd}
- Chauffeur Vehicle Fee: $${vehicleUsd || 0}
- Extra Passenger Surcharge: $${extraPassUsd || 0}
- Extra Baggage Surcharge: $${extraLugUsd || 0}
${porterUsd > 0 ? `- Porter Service: $${porterUsd}\n` : ''}${surcharges?.nightFeeUsd > 0 ? `- Night Service Surcharge: $${surcharges.nightFeeUsd}\n` : ''}${surcharges?.urgentFeeUsd > 0 ? `- Urgent Request Surcharge: $${surcharges.urgentFeeUsd}\n` : ''}${surcharges?.weekendFeeUsd > 0 ? `- Weekend/Holiday Surcharge: $${surcharges.weekendFeeUsd}\n` : ''}- Credit Card Surcharge (4%): $${ccFeeUsd}
--------------------------------------------------
- Estimated Total Cost: $${estimatedTotal} (≈ ${totalKrw ? totalKrw.toLocaleString() : 0} KRW)
            </pre>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `;
};
