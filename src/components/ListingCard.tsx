import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { Star, MapPin, Calendar, DollarSign, Users, Eye, Edit, Trash2 } from 'lucide-react';

interface ListingCardProps {
  listing: any;
  onView?: (listing: any) => void;
  onEdit?: (listing: any) => void;
  onDelete?: (listingId: string) => void;
  onBook?: (listing: any) => void;
  onChat?: (listing: any) => void;
  showActions?: boolean;
  variant?: 'user' | 'agency';
}

export default function ListingCard({ 
  listing, 
  onView, 
  onEdit, 
  onDelete, 
  onBook, 
  onChat, 
  showActions = true,
  variant = 'user'
}: ListingCardProps) {
  // Get main image from placesCovered or photos
  const getMainImage = () => {
    if (listing.placesCovered && listing.placesCovered.length > 0 && 
        listing.placesCovered[0].imageUrls && listing.placesCovered[0].imageUrls.length > 0) {
      return listing.placesCovered[0].imageUrls[0];
    }
    if (listing.photos && listing.photos.length > 0) {
      return listing.photos[0];
    }
    return null;
  };

  const mainImage = getMainImage();
  const duration = listing.itinerary?.length || 0;
  const nights = duration > 0 ? duration - 1 : 0;
  const price = listing.cost || listing.price || 'N/A';
  const packageType = listing.packageType === 'international' ? 'International' : 'Domestic';
  const location = listing.packageType === 'international' 
    ? (listing.countryName || 'Country not specified')
    : (listing.stateName || 'State not specified');

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden group">
      {/* Image Section */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={listing.title || 'Package Image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500 text-sm">No image available</span>
          </div>
        )}
        
        {/* Agency Name Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
            <span className="mr-1"></span>
            {listing.agencyName || 'Unknown Agency'}
          </Badge>
        </div>

        {/* Status Badge */}
        {!listing.approved && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              Pending
            </Badge>
          </div>
        )}

        {/* Verified Badge */}
        {listing.agencyData?.verified && (
          <div className="absolute top-12 left-3">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              ✅ Verified
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {listing.title || `${packageType} Package`}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">{location}</span>
            </CardDescription>
          </div>
          
          {/* Price */}
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">
              {listing.packageType === 'international' ? '$' : '₹'}{price}
            </div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
        </div>

        {/* Rating */}
        {listing.rating > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{listing.rating}</span>
            </div>
            <span className="text-xs text-gray-500">({listing.reviewsCount || 0} reviews)</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Details */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{duration}D / {nights}N</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {listing.rating > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm">{listing.rating}</span>
                <span className="text-xs text-gray-500">({listing.reviewsCount || 0})</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No reviews
              </div>
            )}
          </div>
        </div>

        {/* Places Covered */}
        {listing.placesCovered && listing.placesCovered.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 mb-1">Places Covered:</div>
            <div className="flex flex-wrap gap-1">
              {listing.placesCovered.slice(0, 3).map((place: any, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {place.name?.trim() || 'Unknown Place'}
                </Badge>
              ))}
              {listing.placesCovered.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{listing.placesCovered.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col sm:flex-row gap-2">
            {variant === 'user' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onView?.(listing)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onBook?.(listing)}
                >
                  Book
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onChat?.(listing)}
                >
                  💬 Chat
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onView?.(listing)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit?.(listing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete?.(listing.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}