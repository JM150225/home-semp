# SEMP Visitor Counter

## Overview

This is a global visitor counter web application built for SEMP (Sistema de Estadísticas y Monitoreo de Personas). The application tracks real-time visitor statistics with IP-based geolocation detection, providing a truly global counter where all users see the same visitor count across all visits to the website.

## User Preferences

- Preferred communication style: Simple, everyday language
- **Critical requirement**: Global visitor counter - all users must see the same total visitor count
- Target deployment: GitHub Pages (static hosting)

## System Architecture

### Frontend Architecture
- **Pure HTML/CSS/JavaScript**: No frameworks or build tools required
- **Static hosting compatible**: Designed for GitHub Pages deployment
- **Progressive Enhancement**: Graceful degradation when APIs are unavailable

### Global Data Storage Solution
- **Firebase Realtime Database**: Global visitor counter storage via REST API
- **Primary**: Real-time global visitor count shared across all users
- **Fallback**: localStorage backup for offline functionality
- **Unique visit tracking**: IP + date combination to prevent duplicate counting

### External API Integration
- **Firebase REST API**: Global counter and country statistics storage
- **IP Geolocation**: Uses ipapi.co service for visitor location detection
- **RESTful API**: Standard HTTP requests for data persistence

## Key Components

### HTML Structure (`index.html`)
- **SEMP Header**: Branded navigation with company logo and menu
- **Visitor Counter Section**: Main counter display with visitor statistics
- **Current Visitor Info**: Real-time visitor location and details
- **Responsive Design**: Mobile-first approach with viewport meta tag

### Styling (`styles.css`)
- **CSS Custom Properties**: Modern variable-based theming system
- **Modern Design System**: 
  - Inter font family for clean typography
  - Gradient backgrounds and subtle shadows
  - Consistent color palette with primary/secondary themes
  - Responsive breakpoints for mobile compatibility

### JavaScript Logic (`script.js`)
- **VisitorCounter Class**: Object-oriented approach for counter management
- **Key Methods**:
  - `init()`: Initializes the counter system
  - `loadStoredData()`: Retrieves data from localStorage
  - `detectVisitorLocation()`: Fetches IP-based geolocation
  - `incrementVisitorCount()`: Updates visitor statistics
  - `updateUI()`: Refreshes the display interface
  - `saveData()`: Persists data to localStorage

## Data Flow

1. **Page Load**: Application initializes and loads existing visitor data from localStorage
2. **Location Detection**: Makes API call to ipapi.co to determine visitor's country/location
3. **Count Increment**: Updates total visitor count and country-specific statistics
4. **UI Update**: Refreshes display with new visitor count and current visitor information
5. **Data Persistence**: Saves updated statistics to localStorage for future sessions

## External Dependencies

### CDN Resources
- **Google Fonts**: Inter font family for typography
- **Font Awesome**: Icon library for UI elements (users, globe icons)

### Third-party APIs
- **ipapi.co**: IP geolocation service
  - **Purpose**: Detect visitor's country and location data
  - **Fallback**: Error handling for API failures
  - **Rate Limits**: Free tier limitations may apply

## Deployment Strategy

### Static Hosting
- **No Server Required**: Can be deployed on any static hosting service
- **Compatible Platforms**: 
  - GitHub Pages
  - Netlify
  - Vercel
  - Traditional web hosting
- **HTTPS Required**: For geolocation API access and security

### Browser Compatibility
- **Modern Browsers**: Requires ES6+ support for class syntax
- **localStorage Support**: Essential for data persistence
- **Fetch API**: Required for external API calls

### Performance Considerations
- **Minimal Bundle Size**: No build process or heavy frameworks
- **Fast Load Times**: Optimized CSS and minimal JavaScript
- **Caching Strategy**: Static assets can be cached indefinitely

## Technical Decisions

### Client-side Storage Choice
- **Problem**: Need to persist visitor data without a backend database
- **Solution**: localStorage for simple, persistent client-side storage
- **Pros**: No server required, immediate data access, simple implementation
- **Cons**: Data is device-specific, limited storage capacity, vulnerable to clearing

### API Selection for Geolocation
- **Problem**: Need to detect visitor location for analytics
- **Solution**: ipapi.co for IP-based geolocation
- **Alternatives**: Other IP geolocation services (ipgeolocation.io, geojs.io)
- **Pros**: Free tier available, JSON response format, reliable service
- **Cons**: Rate limiting, requires internet connection, privacy considerations

### No Framework Approach
- **Problem**: Keep application lightweight and simple
- **Solution**: Vanilla JavaScript with modern ES6+ features
- **Pros**: No build tools, faster load times, easier deployment
- **Cons**: More verbose code, manual DOM manipulation, no component reusability