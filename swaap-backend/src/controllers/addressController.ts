// src/controllers/addressController.ts
import { Request, Response } from 'express';
import User from '@/models/User';

interface AddressVerificationRequest extends Request {
  body: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    // Enhanced fields
    landmark?: string;
    nearbyLandmarks?: string[];
    what3words?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    addressType?: 'residential' | 'commercial' | 'other';
    userConfirmedLocation?: boolean;
  };
  user?: any;
}

// Nominatim geocoding service for Nigerian addresses
class NigerianGeocodingService {
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  private readonly rateLimitDelay = 1100; // 1.1 seconds to be safe
  private lastRequestTime = 0;

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  async geocodeAddress(addressString: string, countryCode = 'NG') {
    await this.waitForRateLimit();
    
    try {
      const params = new URLSearchParams({
        q: addressString,
        countrycodes: countryCode,
        format: 'json',
        limit: '5',
        addressdetails: '1',
        'accept-language': 'en'
      });

      const response = await fetch(
        `${this.nominatimBaseUrl}/search?${params}`,
        {
          headers: {
            'User-Agent': 'SwaapApp/1.0 (contact@yourapp.com)' // Replace with your app details
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  async reverseGeocode(latitude: number, longitude: number) {
    await this.waitForRateLimit();
    
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'en'
      });

      const response = await fetch(
        `${this.nominatimBaseUrl}/reverse?${params}`,
        {
          headers: {
            'User-Agent': 'SwaapApp/1.0 (contact@yourapp.com)'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  // Enhanced validation for Nigerian addresses
  validateNigerianAddress(addressComponents: any) {
    const confidence = {
      score: 0,
      factors: [] as string[],
      warnings: [] as string[]
    };

    // Check if we have Nigerian context
    if (addressComponents.country_code?.toLowerCase() === 'ng') {
      confidence.score += 20;
      confidence.factors.push('Nigerian address confirmed');
    }

    // Check for state/region match
    if (addressComponents.state) {
      confidence.score += 25;
      confidence.factors.push('State/region identified');
    }

    // Check for city/town match
    if (addressComponents.city || addressComponents.town || addressComponents.suburb) {
      confidence.score += 20;
      confidence.factors.push('City/locality identified');
    }

    // Check for more specific location data
    if (addressComponents.road || addressComponents.street) {
      confidence.score += 15;
      confidence.factors.push('Street/road identified');
    }

    // Check for postal code (though rare in Nigeria)
    if (addressComponents.postcode) {
      confidence.score += 10;
      confidence.factors.push('Postal code found');
    }

    // Add warnings for common issues
    if (!addressComponents.road && !addressComponents.street) {
      confidence.warnings.push('No specific street identified - consider adding landmarks');
    }

    if (confidence.score < 40) {
      confidence.warnings.push('Low confidence match - manual review recommended');
    }

    return confidence;
  }
}

// Your original verifyAddress function - enhanced with Nominatim + landmarks
export const verifyAddress = async (req: AddressVerificationRequest, res: Response) => {
  try {
    console.log('🏠 Starting address verification...');
    
    const { 
      street, 
      city, 
      state, 
      country, 
      postalCode,
      // Enhanced fields
      landmark,
      nearbyLandmarks = [],
      what3words,
      coordinates,
      addressType = 'residential',
      userConfirmedLocation = false
    } = req.body;
    
    const userId = req.user?._id;

    // Validate required fields
    if (!street || !city || !state || !country) {
      return res.status(400).json({ 
        success: false, 
        message: 'Street, city, state, and country are required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    console.log('📍 Validating address fields...');

    // Simple validation (your existing function)
    const validation = validateAddress(street, city, state, country);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message 
      });
    }

    // Clean up the address fields
    const cleanAddress = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode?.trim() || '',
      landmark: landmark?.trim() || '',
      nearbyLandmarks: nearbyLandmarks.map(l => l.trim()).filter(Boolean),
      what3words: what3words?.trim() || '',
      addressType,
      userConfirmedLocation
    };

    // Initialize geocoding service
    const geocoder = new NigerianGeocodingService();
    let geocodingResults = null;
    let confidence = null;
    let verifiedCoordinates = null;

    try {
      // Create search query with landmarks for better Nigerian results
      const searchComponents = [
        cleanAddress.street,
        cleanAddress.landmark && `near ${cleanAddress.landmark}`,
        cleanAddress.city,
        cleanAddress.state,
        cleanAddress.country
      ].filter(Boolean);

      const searchQuery = searchComponents.join(', ');
      console.log('🔍 Geocoding query:', searchQuery);

      // Attempt geocoding
      geocodingResults = await geocoder.geocodeAddress(searchQuery);
      
      if (geocodingResults && geocodingResults.length > 0) {
        const bestMatch = geocodingResults[0];
        confidence = geocoder.validateNigerianAddress(bestMatch);
        verifiedCoordinates = {
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          accuracy: confidence.score
        };

        console.log('✅ Geocoding successful:', {
          confidence: confidence.score,
          factors: confidence.factors,
          coordinates: verifiedCoordinates
        });
      } else {
        console.log('⚠️ No geocoding results found');
      }

    } catch (geocodingError) {
      console.log('⚠️ Geocoding failed, continuing with manual verification:', geocodingError);
      // Continue with manual verification even if geocoding fails
    }

    // If user provided coordinates, validate them
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      try {
        const reverseResult = await geocoder.reverseGeocode(
          coordinates.latitude, 
          coordinates.longitude
        );
        
        if (reverseResult) {
          const reverseConfidence = geocoder.validateNigerianAddress(reverseResult);
          console.log('📍 User coordinates validated:', {
            provided: coordinates,
            confidence: reverseConfidence.score
          });
          
          // Use user coordinates if they seem more accurate
          if (!verifiedCoordinates || reverseConfidence.score > confidence?.score) {
            verifiedCoordinates = {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              accuracy: reverseConfidence.score,
              source: 'user_provided'
            };
            confidence = reverseConfidence;
          }
        }
      } catch (reverseError) {
        console.log('⚠️ Reverse geocoding failed:', reverseError);
      }
    }

    // Create formatted address with landmarks (enhanced version)
    const addressParts = [
      cleanAddress.street,
      cleanAddress.landmark && `(near ${cleanAddress.landmark})`,
      cleanAddress.city,  
      cleanAddress.state,
      cleanAddress.country,
      cleanAddress.postalCode
    ].filter(Boolean);

    const formattedAddress = addressParts.join(', ');

    console.log('✅ Address validation passed');

    // Get current user to check existing values
    const currentUser = await User.findById(userId).select('verificationLevel trustScore');
    
    // Calculate new values safely
    const currentVerificationLevel = Number(currentUser?.verificationLevel) || 0;
    const currentTrustScore = Number(currentUser?.trustScore) || 0;

    // Determine verification status based on confidence and user confirmation
    let isVerified = false;
    let verificationStatus: 'verified' | 'pending_review' | 'needs_manual_review' = 'needs_manual_review';

    if (confidence && confidence.score >= 60 && userConfirmedLocation) {
      isVerified = true;
      verificationStatus = 'verified';
    } else if (confidence && confidence.score >= 40) {
      verificationStatus = 'pending_review';
    }

    // Build enhanced address object
    const enhancedAddress = {
      street: cleanAddress.street,
      city: cleanAddress.city,
      state: cleanAddress.state,
      country: cleanAddress.country,
      postalCode: cleanAddress.postalCode,
      formattedAddress,
      verified: isVerified,
      
      // Enhanced fields
      landmark: cleanAddress.landmark,
      nearbyLandmarks: cleanAddress.nearbyLandmarks,
      what3words: cleanAddress.what3words,
      addressType: cleanAddress.addressType,
      verificationStatus,
      
      // Geocoding results
      coordinates: verifiedCoordinates,
      geocodingResults: geocodingResults ? {
        query: searchComponents.join(', '),
        resultCount: geocodingResults.length,
        confidence: confidence?.score || 0,
        factors: confidence?.factors || [],
        warnings: confidence?.warnings || []
      } : null,
      
      // Metadata
      userConfirmedLocation,
      lastUpdated: new Date()
    };

    // Update user with enhanced address
    const updateData: any = {
      address: enhancedAddress,
      addressVerified: isVerified,
      locationUpdatedAt: new Date()
    };

    // Update location coordinates if available
    if (verifiedCoordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: [verifiedCoordinates.longitude, verifiedCoordinates.latitude]
      };
    }

    // Only increment trust score if verified
    if (isVerified) {
      updateData.verificationLevel = currentVerificationLevel + 1;
      updateData.trustScore = currentTrustScore + 25; // Full points for verified address
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true,
        select: 'addressVerified verificationLevel trustScore address location'
      }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('🎉 User address updated successfully');

    return res.status(200).json({
      success: true,
      message: isVerified 
        ? 'Address verified and updated successfully'
        : 'Address recorded, manual review may be required',
      data: {
        verifiedAddress: enhancedAddress,
        verification: {
          status: verificationStatus,
          confidence: confidence?.score || 0,
          factors: confidence?.factors || [],
          warnings: confidence?.warnings || [],
          nextSteps: !isVerified ? [
            'Confirm your location on the map',
            'Add more specific landmarks',  
            'Wait for manual review by admin'
          ] : []
        },
        user: {
          addressVerified: updatedUser.addressVerified,
          verificationLevel: updatedUser.verificationLevel,
          trustScore: updatedUser.trustScore,
          address: updatedUser.address,
          hasLocation: !!updatedUser.location
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Address verification error:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Address verification failed',
      error: error.message 
    });
  }
};

// Simple address validation function (your existing one)
function validateAddress(street: string, city: string, state: string, country: string) {
  // Check minimum lengths
  if (street.length < 3) {
    return { isValid: false, message: 'Street address must be at least 3 characters' };
  }
  
  if (city.length < 2) {
    return { isValid: false, message: 'City name must be at least 2 characters' };
  }
  
  if (state.length < 2) {
    return { isValid: false, message: 'State name must be at least 2 characters' };
  }
  
  if (country.length < 2) {
    return { isValid: false, message: 'Country name must be at least 2 characters' };
  }

  // Check for invalid patterns
  if (/^\d+$/.test(city)) {
    return { isValid: false, message: 'City cannot be only numbers' };
  }

  if (/^\d+$/.test(state)) {
    return { isValid: false, message: 'State cannot be only numbers' };
  }

  // Nigerian states validation (adjust for your region)
  if (country.toLowerCase().includes('nigeria')) {
    const nigerianStates = [
      'abia', 'adamawa', 'akwa ibom', 'anambra', 'bauchi', 'bayelsa', 'benue', 
      'borno', 'cross river', 'delta', 'ebonyi', 'edo', 'ekiti', 'enugu', 
      'gombe', 'imo', 'jigawa', 'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 
      'kwara', 'lagos', 'nasarawa', 'niger', 'ogun', 'ondo', 'osun', 'oyo', 
      'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara', 'abuja', 'fct'
    ];

    const stateInput = state.toLowerCase();
    const isValidState = nigerianStates.some(validState => 
      stateInput.includes(validState) || validState.includes(stateInput.replace(/\s+state$/i, ''))
    );
    
    if (!isValidState) {
      return { 
        isValid: false, 
        message: `"${state}" is not a recognized Nigerian state` 
      };
    }
  }

  return { isValid: true, message: 'Address is valid' };
}

// NEW: Address search endpoint for frontend autocomplete
export const searchAddress = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const geocoder = new NigerianGeocodingService();
    const results = await geocoder.geocodeAddress(query);

    const formattedResults = results.map((result: any) => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      type: result.type,
      importance: result.importance,
      addressComponents: {
        road: result.address?.road,
        suburb: result.address?.suburb,
        city: result.address?.city || result.address?.town,
        state: result.address?.state,
        country: result.address?.country,
        postcode: result.address?.postcode
      }
    }));

    res.json({
      success: true,
      results: formattedResults,
      count: formattedResults.length
    });

  } catch (error: any) {
    console.error('Address search error:', error);
    res.status(500).json({
      success: false,
      message: 'Address search failed',
      error: error.message
    });
  }
};