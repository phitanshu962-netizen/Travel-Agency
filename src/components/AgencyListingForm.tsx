import React, { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload } from 'lucide-react';
import { getDbInstance, getStorageInstance } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Place {
  id: string;
  name: string;
  images: File[];
  imageUrls: string[];
}

interface ItineraryDay {
  id: string;
  day: number;
  placeName: string;
  description: string;
}

interface FormData {
  packageType: 'international' | 'domestic';
  countryName?: string;
  stateName?: string;
  placesCovered: Place[];
  tourCategories: string[];
  hotelType: 'budget' | 'deluxe' | 'premium';
  mealPlan: 'no-meal' | 'breakfast' | 'breakfast-dinner' | 'all-meals';
  itinerary: ItineraryDay[];
  inclusions: string;
  exclusions: string;
  cost: string;
}

interface AgencyListingFormProps {
  agencyId: string;
  onSuccess: () => void;
  initialData?: FormData & { id?: string };
}

const tourCategories = [
  'Family',
  'Honeymoon', 
  'Friends',
  'Religious'
];

const hotelTypes = [
  { value: 'budget', label: 'Budget' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'premium', label: 'Premium' }
];

const mealPlans = [
  { value: 'no-meal', label: 'No Meal' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'breakfast-dinner', label: 'Breakfast + Dinner' },
  { value: 'all-meals', label: 'All Meals' }
];

export default function AgencyListingForm({ agencyId, onSuccess, initialData }: AgencyListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: initialData || {
      packageType: 'domestic',
      placesCovered: [],
      tourCategories: [],
      hotelType: 'budget',
      mealPlan: 'no-meal',
      itinerary: [],
      inclusions: '',
      exclusions: '',
      cost: ''
    }
  });

  const packageType = watch('packageType');
  const placesCovered = watch('placesCovered') || [];
  const itinerary = watch('itinerary') || [];

  const addPlace = () => {
    const newPlace: Place = {
      id: Date.now().toString(),
      name: '',
      images: [],
      imageUrls: []
    };
    setValue('placesCovered', [...placesCovered, newPlace]);
  };

  const removePlace = (index: number) => {
    const newPlaces = placesCovered.filter((_, i) => i !== index);
    setValue('placesCovered', newPlaces);
  };

  const updatePlace = (index: number, field: keyof Place, value: any) => {
    const newPlaces = [...placesCovered];
    newPlaces[index] = { ...newPlaces[index], [field]: value };
    setValue('placesCovered', newPlaces);
  };

  const addItineraryDay = () => {
    const newDay: ItineraryDay = {
      id: Date.now().toString(),
      day: itinerary.length + 1,
      placeName: '',
      description: ''
    };
    setValue('itinerary', [...itinerary, newDay]);
  };

  const removeItineraryDay = (index: number) => {
    const newItinerary = itinerary.filter((_, i) => i !== index);
    // Re-number the days
    const renumberedItinerary = newItinerary.map((day, i) => ({
      ...day,
      day: i + 1
    }));
    setValue('itinerary', renumberedItinerary);
  };

  const updateItineraryDay = (index: number, field: keyof ItineraryDay, value: any) => {
    const newItinerary = [...itinerary];
    newItinerary[index] = { ...newItinerary[index], [field]: value };
    setValue('itinerary', newItinerary);
  };

  const uploadImages = async (places: Place[]): Promise<Place[]> => {
    const storageInstance = getStorageInstance();

    if (!storageInstance) {
      throw new Error('Storage instance not available');
    }

    const updatedPlaces = [...places];

    for (let placeIndex = 0; placeIndex < places.length; placeIndex++) {
      const place = places[placeIndex];
      const placeImages = place.images;

      if (placeImages.length > 0) {
        const imageUrls: string[] = [];

        for (let imgIndex = 0; imgIndex < placeImages.length; imgIndex++) {
          const file = placeImages[imgIndex];
          const storageRef = ref(storageInstance, `listings/${agencyId}/${Date.now()}_${placeIndex}_${imgIndex}_${file.name}`);

          try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            imageUrls.push(downloadURL);

            // Update progress
            const totalProgress = Math.round(((placeIndex * 100) + ((imgIndex + 1) / placeImages.length * 100)) / places.length);
            setUploadProgress(prev => ({
              ...prev,
              [`${place.name}-${file.name}`]: totalProgress
            }));
          } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error(`Failed to upload image: ${file.name}`);
          }
        }

        // Update the place with image URLs
        updatedPlaces[placeIndex] = {
          ...place,
          imageUrls,
          images: [] // Clear File objects to avoid Firebase error
        };
      }
    }

    return updatedPlaces;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Upload images and get updated places with image URLs
      const placesWithImages = await uploadImages(placesCovered);

      // Debug: Log the placesWithImages structure
      console.log('Places with images:', placesWithImages);
      console.log('First place image URLs:', placesWithImages[0]?.imageUrls);

      // Prepare the listing data - ensure no File objects are included
      // Extract main photo from first place for backward compatibility
      const mainPhoto = placesWithImages.length > 0 && placesWithImages[0].imageUrls.length > 0
        ? placesWithImages[0].imageUrls[0]
        : '';

      console.log('Main photo URL:', mainPhoto);

      const listingData = {
        ...data,
        placesCovered: placesWithImages,
        itinerary: data.itinerary,
        photos: mainPhoto ? [mainPhoto] : [], // Add main photo for backward compatibility
        agencyId,
        approved: false, // Requires admin approval
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Debug: Log the final listing data
      console.log('Final listing data:', listingData);

      const dbInstance = getDbInstance();
      
      if (!dbInstance) {
        throw new Error('Database instance not available');
      }

      if (initialData?.id) {
        // Update existing listing
        await updateDoc(doc(dbInstance, 'listings', initialData.id), listingData);
        alert('Listing updated successfully!');
      } else {
        // Create new listing
        await addDoc(collection(dbInstance, 'listings'), listingData);
        alert('Listing submitted for approval!');
      }

      onSuccess();
    } catch (error) {
      console.error('Error submitting listing:', error);
      alert('Failed to submit listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            {initialData ? 'Edit Travel Package' : 'Create New Travel Package'}
          </CardTitle>
          <CardDescription>
            Fill in all the details to create or update your travel package listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            {/* 1. Package Type */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">1. Package Type</h3>
              <Controller
                name="packageType"
                control={control}
                render={({ field }) => (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="international"
                          checked={field.value === 'international'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span>International</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="domestic"
                          checked={field.value === 'domestic'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="form-radio h-4 w-4 text-blue-600"
                        />
                        <span>Domestic</span>
                      </label>
                    </div>

                    {field.value === 'international' && (
                      <div className="space-y-2">
                        <Label htmlFor="countryName">Country Name</Label>
                        <Input
                          id="countryName"
                          placeholder="Enter country name"
                          onChange={(e) => setValue('countryName', e.target.value)}
                          defaultValue={initialData?.countryName || ''}
                        />
                      </div>
                    )}

                    {field.value === 'domestic' && (
                      <div className="space-y-2">
                        <Label htmlFor="stateName">State Name</Label>
                        <Input
                          id="stateName"
                          placeholder="Enter state name"
                          onChange={(e) => setValue('stateName', e.target.value)}
                          defaultValue={initialData?.stateName || ''}
                        />
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            {/* 2. Places Covered */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold border-b pb-2">2. Places Covered</h3>
                <Button type="button" onClick={addPlace} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Place
                </Button>
              </div>
              
              {placesCovered.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No places added yet. Click "Add Place" to start.</p>
                </div>
              ) : (
                placesCovered.map((place, index) => (
                  <Card key={place.id} className="border-l-4 border-blue-400">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Place {index + 1}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePlace(index)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`placeName-${index}`}>Place Name</Label>
                          <Input
                            id={`placeName-${index}`}
                            placeholder="Enter place name"
                            value={place.name}
                            onChange={(e) => updatePlace(index, 'name', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`placeImages-${index}`}>Upload Images</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id={`placeImages-${index}`}
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                updatePlace(index, 'images', files);
                              }}
                              className="flex-1"
                            />
                            <div className="text-xs text-gray-500">
                              {place.images.length} files selected
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 3. Tour Category */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">3. Tour Category</h3>
              <Controller
                name="tourCategories"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tourCategories.map((category) => (
                      <label key={category} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={(field.value || []).includes(category)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const currentCategories = field.value || [];
                            const newCategories = checked
                              ? [...currentCategories, category]
                              : currentCategories.filter((c: string) => c !== category);
                            field.onChange(newCategories);
                          }}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* 4. Hotel & Meal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">4. Hotel Type</h3>
                <Controller
                  name="hotelType"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select hotel type</option>
                      {hotelTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">5. Meal Plan</h3>
                <Controller
                  name="mealPlan"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select meal plan</option>
                      {mealPlans.map((plan) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            {/* 6. Itinerary Builder */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold border-b pb-2">6. Itinerary Builder</h3>
                <Button type="button" onClick={addItineraryDay} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Day
                </Button>
              </div>

              {itinerary.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No itinerary days added yet. Click "Add Day" to start.</p>
                </div>
              ) : (
                itinerary.map((day, index) => (
                  <Card key={day.id} className="border-l-4 border-green-400">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Day {day.day}</h4>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItineraryDay(index)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`dayPlace-${index}`}>Place Name</Label>
                          <Input
                            id={`dayPlace-${index}`}
                            placeholder="Enter place name for this day"
                            value={day.placeName}
                            onChange={(e) => updateItineraryDay(index, 'placeName', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`dayDescription-${index}`}>Description</Label>
                          <Textarea
                            id={`dayDescription-${index}`}
                            placeholder="Describe what will happen on this day..."
                            value={day.description}
                            onChange={(e) => updateItineraryDay(index, 'description', e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 6. Cost */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">6. Package Cost</h3>
              <Controller
                name="cost"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost">Package Cost (per person)</Label>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="Enter package cost"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration Summary</Label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-2">Calculated from itinerary:</div>
                        <div className="flex justify-between font-medium">
                          <span>Total Days:</span>
                          <span>{itinerary.length}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total Nights:</span>
                          <span>{itinerary.length > 0 ? itinerary.length - 1 : 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>

            {/* 7. Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">7. Inclusions</h3>
                <Controller
                  name="inclusions"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      placeholder="List what is included in the package (e.g., accommodation, transport, meals, activities)"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      rows={6}
                    />
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">8. Exclusions</h3>
                <Controller
                  name="exclusions"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      placeholder="List what is NOT included in the package (e.g., personal expenses, optional activities, tips)"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      rows={6}
                    />
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-600">
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                      <div key={fileName} className="flex justify-between">
                        <span>{fileName}</span>
                        <span>{progress}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Submitting...' : initialData ? 'Update Listing' : 'Submit for Approval'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}