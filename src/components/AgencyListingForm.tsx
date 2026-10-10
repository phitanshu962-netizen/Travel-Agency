import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Upload, ClipboardList, X, Globe, Palmtree, ArrowLeft } from 'lucide-react';
import { getDbInstance } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { compressImage } from '@/lib/imageUtils';

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
  images?: File[];
  imageUrls?: string[];
  imageUrl?: string;
}

interface FormData {
  title?: string;
  packageType: 'international' | 'domestic';
  countryName?: string;
  stateName?: string;
  countryNames?: string[];
  stateNames?: string[];
  pickUpLocation: string;
  dropLocation: string;
  placesCovered: Place[];
  tourCategories: string[];
  hotelTypes: string[];
  mealPlan: string[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  cost: string;
  experienceType?: string[];
  discountCategory?: 'none' | '10-off' | '50-off' | 'flash-deals' | '';
  isTrending?: boolean;
  season?: 'summer' | 'monsoon' | 'winter' | 'spring' | 'all-seasons' | '';
  eventType?: 'new-year' | 'diwali' | 'summer-vacation' | 'weekend' | '';
}

interface AgencyListingFormProps {
  agencyId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  initialData?: FormData & { id?: string };
}

const sanitizeFileName = (name: string) => {
  if (!name) return '';
  return name.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
};

const cleanPlaceNameForSEO = (name: string) => {
  if (!name) return '';
  const parts = name.split(/[\s\-\/]+/);
  const noiseWords = /^(full|half|guided|scenic|enroute|en-route|leisure|free|optional|morning|afternoon|evening|today|start|end|return|back|arrival|departure|transfer|sightseeing|local|tour|visit|trip|journey|welcome|explore|in|at|from|to|for|via|by|towards|of|and|&|an|a|the|airport|station|railway|hotel|resort|day|night|nights|days|excursion|drive|activities|stay|overnight|tourist|spot|spots)$/i;
  const cleanedParts = parts.filter(part => !noiseWords.test(part));
  if (cleanedParts.length === 0) return '';
  return cleanedParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const tourCategories = [
  'Family',
  'Honeymoon', 
  'Friends',
  'Religious',
  'Fix Departure'
];

const hotelTypes = [
  { value: 'budget', label: 'Budget' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'premium', label: 'Premium' }
];

const mealPlans = [
  { value: 'no-meal', label: 'No Meal' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'breakfast-lunch', label: 'Breakfast + Lunch' },
  { value: 'breakfast-dinner', label: 'Breakfast + Dinner' },
  { value: 'lunch-dinner', label: 'Lunch + Dinner' },
  { value: 'all-meals', label: 'All Meals' }
];

// List of Indian states
const indianStates = [
  // States (28)
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',

  // Union Territories (8)
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];


// List of countries
const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
  'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Cote d'Ivoire", 'Croatia',
  'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe'
];

export default function AgencyListingForm({ agencyId, onSuccess, onCancel, initialData }: AgencyListingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: initialData ? {
      ...initialData,
      title: initialData.title || '',
      stateNames: Array.isArray(initialData.stateNames)
        ? initialData.stateNames
        : (initialData.stateName
          ? initialData.stateName.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []),
      countryNames: Array.isArray(initialData.countryNames)
        ? initialData.countryNames
        : (initialData.countryName
          ? initialData.countryName.split(',').map((c: string) => c.trim()).filter(Boolean)
          : []),
      placesCovered: initialData.placesCovered && initialData.placesCovered.length > 0 ? [{
        id: 'photos',
        name: '',
        images: [],
        imageUrls: initialData.placesCovered.reduce((acc: string[], p: any) => [...acc, ...(p.imageUrls || [])], [])
      }] : [{ id: 'photos', name: '', images: [], imageUrls: [] }],
      itinerary: initialData.itinerary ? initialData.itinerary.map((day: any) => ({
        ...day,
        images: [],
        imageUrls: day.imageUrl ? [day.imageUrl] : (Array.isArray(day.imageUrls) && day.imageUrls.length > 0 ? [day.imageUrls[0]] : [])
      })) : [],
      mealPlan: Array.isArray(initialData.mealPlan)
        ? initialData.mealPlan
        : (initialData.mealPlan ? [initialData.mealPlan] : []),
      inclusions: typeof (initialData.inclusions as any) === 'string'
        ? (initialData.inclusions as any).split('\n').filter((item: string) => item.trim() !== '')
        : (Array.isArray(initialData.inclusions) ? initialData.inclusions : ['']),
      exclusions: typeof (initialData.exclusions as any) === 'string'
        ? (initialData.exclusions as any).split('\n').filter((item: string) => item.trim() !== '')
        : (Array.isArray(initialData.exclusions) ? initialData.exclusions : ['']),
      experienceType: Array.isArray(initialData.experienceType)
        ? initialData.experienceType
        : (initialData.experienceType && typeof initialData.experienceType === 'string'
            ? [initialData.experienceType]
            : [])
    } : {
      title: '',
      packageType: 'domestic',
      countryName: '',
      stateName: '',
      countryNames: [],
      stateNames: [],
      pickUpLocation: '',
      dropLocation: '',
      placesCovered: [{ id: 'photos', name: '', images: [], imageUrls: [] }],
      tourCategories: [],
      hotelTypes: [],
      mealPlan: [],
      itinerary: [],
      inclusions: [''],
      exclusions: [''],
      cost: '',
      experienceType: [],
      discountCategory: 'none',
      isTrending: false,
      season: '',
      eventType: ''
    }
  });

  const packageType = watch('packageType');
  const placesCovered = watch('placesCovered') || [];
  const itinerary = watch('itinerary') || [];
  const countryName = watch('countryName');
  const stateName = watch('stateName');
  const stateNames = watch('stateNames') || [];
  const countryNames = watch('countryNames') || [];
  const inclusions = watch('inclusions') || [''];
  const exclusions = watch('exclusions') || [''];
  const experienceType = watch('experienceType') || [];
  
  const [experienceInput, setExperienceInput] = useState('');
  const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);
  const experienceDropdownRef = useRef<HTMLDivElement>(null);

  const [stateInput, setStateInput] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const [countryInput, setCountryInput] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  
  const PRESET_EXPERIENCES = ['Trekking', 'Snow', 'Adventure', 'Water Sports', 'Wildlife', 'Cultural', 'Sightseeing'];

  const filteredExperiences = PRESET_EXPERIENCES.filter(
    (exp) => exp.toLowerCase().includes(experienceInput.toLowerCase()) && !experienceType.includes(exp)
  );

  const filteredStates = indianStates.filter(
    (state) => state.toLowerCase().includes(stateInput.toLowerCase()) && !stateNames.includes(state)
  );

  const filteredCountries = countries.filter(
    (country) => country.toLowerCase().includes(countryInput.toLowerCase()) && !countryNames.includes(country)
  );

  const addExperience = (exp: string) => {
    if (exp.trim() && !experienceType.includes(exp.trim())) {
      setValue('experienceType', [...experienceType, exp.trim()]);
    }
    setExperienceInput('');
    setIsExperienceDropdownOpen(false);
  };

  const removeExperience = (expToRemove: string) => {
    setValue('experienceType', experienceType.filter((exp: string) => exp !== expToRemove));
  };

  const addState = (state: string) => {
    if (state.trim() && !stateNames.includes(state.trim())) {
      setValue('stateNames', [...stateNames, state.trim()]);
    }
    setStateInput('');
    setIsStateDropdownOpen(false);
  };

  const removeState = (stateToRemove: string) => {
    setValue('stateNames', stateNames.filter((s: string) => s !== stateToRemove));
  };

  const addCountry = (country: string) => {
    if (country.trim() && !countryNames.includes(country.trim())) {
      setValue('countryNames', [...countryNames, country.trim()]);
    }
    setCountryInput('');
    setIsCountryDropdownOpen(false);
  };

  const removeCountry = (countryToRemove: string) => {
    setValue('countryNames', countryNames.filter((c: string) => c !== countryToRemove));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (experienceDropdownRef.current && !experienceDropdownRef.current.contains(event.target as Node)) {
        setIsExperienceDropdownOpen(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load default inclusions and exclusions if creating a new listing
  useEffect(() => {
    async function loadAgencyDefaults() {
      if (initialData) return; // If editing, we use the package's existing values
      const dbInstance = getDbInstance();
      if (!dbInstance || !agencyId) return;
      
      try {
        const agencyDoc = await getDoc(doc(dbInstance, 'users', agencyId));
        if (agencyDoc.exists()) {
          const data = agencyDoc.data();
          if (data.defaultInclusions) {
            const incls = Array.isArray(data.defaultInclusions)
              ? data.defaultInclusions
              : data.defaultInclusions.split('\n').filter((item: string) => item.trim() !== '');
            if (incls.length > 0) {
              setValue('inclusions', incls);
            }
          }
          if (data.defaultExclusions) {
            const excls = Array.isArray(data.defaultExclusions)
              ? data.defaultExclusions
              : data.defaultExclusions.split('\n').filter((item: string) => item.trim() !== '');
            if (excls.length > 0) {
              setValue('exclusions', excls);
            }
          }
        }
      } catch (error) {
        console.error("Error loading agency defaults:", error);
      }
    }
    loadAgencyDefaults();
  }, [agencyId, initialData, setValue]);

  const addInclusion = () => {
    setValue('inclusions', [...inclusions, '']);
  };

  const removeInclusion = (index: number) => {
    const updated = inclusions.filter((_, i) => i !== index);
    setValue('inclusions', updated.length > 0 ? updated : ['']);
  };

  const updateInclusion = (index: number, value: string) => {
    const updated = [...inclusions];
    updated[index] = value;
    setValue('inclusions', updated);
  };

  const addExclusion = () => {
    setValue('exclusions', [...exclusions, '']);
  };

  const removeExclusion = (index: number) => {
    const updated = exclusions.filter((_, i) => i !== index);
    setValue('exclusions', updated.length > 0 ? updated : ['']);
  };

  const updateExclusion = (index: number, value: string) => {
    const updated = [...exclusions];
    updated[index] = value;
    setValue('exclusions', updated);
  };

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
    const defaultPlace: Place = { id: 'photos', name: '', images: [], imageUrls: [] };
    newPlaces[index] = { ...(newPlaces[index] || defaultPlace), [field]: value };
    setValue('placesCovered', newPlaces);
  };

  const addItineraryDay = () => {
    const newDay: ItineraryDay = {
      id: Date.now().toString(),
      day: itinerary.length + 1,
      placeName: '',
      description: '',
      images: [],
      imageUrls: []
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

  const updateItineraryDay = (index: number, fieldOrUpdates: keyof ItineraryDay | Partial<ItineraryDay>, value?: any) => {
    const currentItinerary = getValues('itinerary') || itinerary || [];
    const newItinerary = [...currentItinerary];
    if (typeof fieldOrUpdates === 'string') {
      newItinerary[index] = { ...newItinerary[index], [fieldOrUpdates]: value };
    } else if (typeof fieldOrUpdates === 'object') {
      newItinerary[index] = { ...newItinerary[index], ...fieldOrUpdates };
    }
    setValue('itinerary', newItinerary, { shouldDirty: true, shouldTouch: true });
  };

  const uploadImages = async (places: Place[]): Promise<Place[]> => {
    const values = getValues();
    const stateOrCountry = values.packageType === 'domestic'
      ? (values.stateNames && values.stateNames.length > 0 ? values.stateNames[0] : (values.stateName || ''))
      : (values.countryNames && values.countryNames.length > 0 ? values.countryNames[0] : (values.countryName || ''));

    const cleanState = sanitizeFileName(stateOrCountry || 'Travel');
    const cleanPackageTitle = sanitizeFileName(values.title || 'Package');

    const updatedPlaces = [...places];

    for (let placeIndex = 0; placeIndex < places.length; placeIndex++) {
      const place = places[placeIndex];
      const placeImages = place.images;

      if (placeImages && placeImages.length > 0) {
        const imageUrls: string[] = [];

        for (let imgIndex = 0; imgIndex < placeImages.length; imgIndex++) {
          const file = placeImages[imgIndex];
          const placeName = place.name && place.name !== 'photos' ? place.name : cleanPackageTitle;
          const placeNameOnly = cleanPlaceNameForSEO(placeName);
          const cleanPlaceName = sanitizeFileName(placeNameOnly || cleanPackageTitle);

          try {
            // Auto-compress large DSLR / high-res images before upload to ensure ultra-fast and reliable upload
            let fileToUpload = file;
            try {
              fileToUpload = await compressImage(file, {
                maxSizeMB: 2.5,
                maxWidthOrHeight: 2560,
                useWebWorker: true,
                quality: 0.85
              });
            } catch (compErr) {
              console.warn('Image compression fallback to original:', compErr);
              fileToUpload = file;
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('category', 'listings');
            formData.append('userId', agencyId);
            formData.append('subfolder', `${cleanState}/${cleanPlaceName}`);

            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) {
              const errData = await uploadRes.json().catch(() => ({}));
              throw new Error(errData.error || 'Image upload failed');
            }
            const uploadData = await uploadRes.json();
            imageUrls.push(uploadData.url);

            // Update progress
            const totalProgress = Math.round(((placeIndex * 100) + ((imgIndex + 1) / placeImages.length * 100)) / places.length);
            setUploadProgress(prev => ({
              ...prev,
              [`${file.name}`]: totalProgress
            }));
          } catch (error) {
            console.error('Error uploading image:', error);
            throw new Error(`Failed to upload image: ${file.name}`);
          }
        }

        // Update the place with image URLs (combine existing and new)
        updatedPlaces[placeIndex] = {
          ...place,
          imageUrls: [...(place.imageUrls || []), ...imageUrls],
          images: [] // Clear File objects
        };
      }
    }

    return updatedPlaces;
  };

  const uploadItineraryImages = async (days: ItineraryDay[]): Promise<ItineraryDay[]> => {
    const values = getValues();
    const stateOrCountry = values.packageType === 'domestic'
      ? (values.stateNames && values.stateNames.length > 0 ? values.stateNames[0] : (values.stateName || ''))
      : (values.countryNames && values.countryNames.length > 0 ? values.countryNames[0] : (values.countryName || ''));

    const cleanState = sanitizeFileName(stateOrCountry || 'Travel');

    const updatedDays = [...days];

    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];
      const dayImages = day.images;

      if (dayImages && dayImages.length > 0) {
        const file = dayImages[0];
        const placeNameOnly = cleanPlaceNameForSEO(day.placeName);
        const cleanPlace = sanitizeFileName(placeNameOnly || `Day-${day.day}`);

        try {
          // Auto-compress large DSLR / high-res images before upload to ensure ultra-fast and reliable upload
          let fileToUpload = file;
          try {
            fileToUpload = await compressImage(file, {
              maxSizeMB: 2.5,
              maxWidthOrHeight: 2560,
              useWebWorker: true,
              quality: 0.85
            });
          } catch (compErr) {
            console.warn('Image compression fallback to original:', compErr);
            fileToUpload = file;
          }

          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('category', 'listings');
          formData.append('userId', agencyId);
          formData.append('subfolder', `itinerary/${cleanState}/${cleanPlace}`);

          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Itinerary image upload failed');
          }
          const uploadData = await uploadRes.json();

          setUploadProgress(prev => ({
            ...prev,
            [`${file.name}`]: 100
          }));

          updatedDays[dayIndex] = {
            ...day,
            imageUrl: uploadData.url,
            imageUrls: [uploadData.url],
            images: [] // Clear File objects
          };
        } catch (error) {
          console.error('Error uploading itinerary image:', error);
          throw new Error(`Failed to upload itinerary image: ${file.name}`);
        }
      } else if (day.imageUrls && day.imageUrls.length > 0) {
        updatedDays[dayIndex] = {
          ...day,
          imageUrl: day.imageUrls[0],
          imageUrls: [day.imageUrls[0]],
          images: []
        };
      }
    }

    return updatedDays;
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    if (data.packageType === 'domestic' && (!data.stateNames || data.stateNames.length === 0)) {
      alert('Please select at least one state.');
      setIsSubmitting(false);
      return;
    }
    if (data.packageType === 'international' && (!data.countryNames || data.countryNames.length === 0)) {
      alert('Please select at least one country.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload images and get updated places with image URLs
      const placesWithImages = await uploadImages(placesCovered);

      // Upload itinerary images
      const itineraryWithImages = await uploadItineraryImages(itinerary);

      // Fallback: If no package photos are uploaded, copy itinerary images to placesCovered
      let finalPlacesWithImages = placesWithImages;
      const packageHasPhotos = placesWithImages.length > 0 && placesWithImages[0].imageUrls && placesWithImages[0].imageUrls.length > 0;
      
      if (!packageHasPhotos) {
        const allItineraryUrls: string[] = [];
        itineraryWithImages.forEach(day => {
          if (day.imageUrls && day.imageUrls.length > 0) {
            allItineraryUrls.push(...day.imageUrls);
          }
        });
        
        if (allItineraryUrls.length > 0) {
          finalPlacesWithImages = [{
            id: 'photos',
            name: '',
            images: [],
            imageUrls: allItineraryUrls
          }];
        }
      }

      // Debug: Log the placesWithImages structure
      console.log('Places with images:', finalPlacesWithImages);

      // Prepare the listing data - ensure no File objects are included
      // Extract main photo from first place for backward compatibility
      const mainPhoto = finalPlacesWithImages.length > 0 && finalPlacesWithImages[0].imageUrls.length > 0
        ? finalPlacesWithImages[0].imageUrls[0]
        : '';

      console.log('Main photo URL:', mainPhoto);

      // Fetch agency profile to embed branding directly in listing document
      const dbInstance = getDbInstance();
      let agencyProfile: any = null;
      if (dbInstance && agencyId) {
        try {
          const userDoc = await getDoc(doc(dbInstance, 'users', agencyId));
          if (userDoc.exists()) {
            agencyProfile = userDoc.data();
          }
        } catch (e) {
          console.warn('Could not load agency profile for listing:', e);
        }
      }

      const listingData = {
        ...data,
        stateName: data.packageType === 'domestic' && data.stateNames ? data.stateNames.join(', ') : '',
        countryName: data.packageType === 'international' && data.countryNames ? data.countryNames.join(', ') : '',
        stateNames: data.packageType === 'domestic' ? data.stateNames : [],
        countryNames: data.packageType === 'international' ? data.countryNames : [],
        placesCovered: finalPlacesWithImages,
        itinerary: itineraryWithImages,
        inclusions: Array.isArray(data.inclusions)
          ? data.inclusions.filter((item: string) => item.trim() !== '').join('\n')
          : (data.inclusions || ''),
        exclusions: Array.isArray(data.exclusions)
          ? data.exclusions.filter((item: string) => item.trim() !== '').join('\n')
          : (data.exclusions || ''),
        photos: mainPhoto ? [mainPhoto] : [], // Add main photo for backward compatibility
        agencyId,
        agencyName: agencyProfile?.companyName || agencyProfile?.name || agencyProfile?.displayName || 'Travel Agency',
        agencyLogo: agencyProfile?.logoUrl || agencyProfile?.agencyLogo || agencyProfile?.avatarUrl || '',
        logoUrl: agencyProfile?.logoUrl || agencyProfile?.agencyLogo || '',
        agencyData: agencyProfile ? {
          companyName: agencyProfile.companyName || agencyProfile.name || '',
          name: agencyProfile.name || '',
          logoUrl: agencyProfile.logoUrl || agencyProfile.agencyLogo || '',
          verified: !!agencyProfile.verified,
          phone: agencyProfile.phone || agencyProfile.contactNumber || '',
        } : undefined,
        approved: false, // Requires admin approval
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Sanitize undefined fields from listingData to prevent FirebaseError
      const sanitizeData = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeData(item));
        }
        if (typeof obj === 'object' && !(obj instanceof Date)) {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
              newObj[key] = sanitizeData(obj[key]);
            }
          });
          return newObj;
        }
        return obj;
      };

      const sanitizedListingData = sanitizeData(listingData);

      // Debug: Log the final listing data
      console.log('Final listing data:', sanitizedListingData);
      
      if (!dbInstance) {
        throw new Error('Database instance not available');
      }

      if (initialData?.id) {
        // Update existing listing
        await updateDoc(doc(dbInstance, 'listings', initialData.id), sanitizedListingData);
        alert('Listing updated successfully!');
      } else {
        // Create new listing
        await addDoc(collection(dbInstance, 'listings'), sanitizedListingData);
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

  const isFormDirty = Boolean(
    watch('title')?.trim() ||
    watch('cost')?.trim() ||
    (placesCovered && placesCovered.length > 0 && placesCovered[0]?.name)
  );

  const handleCancelWithConfirmation = () => {
    if (isFormDirty && !initialData) {
      if (typeof window !== 'undefined' && window.confirm('Discard unsaved package details? Your changes will be lost.')) {
        if (onCancel) onCancel();
        else window.history.back();
      }
    } else {
      if (onCancel) onCancel();
      else window.history.back();
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-50 text-orange-600 rounded-md shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <span className="truncate">{initialData ? 'Edit Travel Package' : 'Create New Travel Package'}</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm md:text-base">
            Fill in all the details below to configure your travel package listing.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancelWithConfirmation}
          className="self-start sm:self-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Listings</span>
        </button>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 md:p-10 space-y-8 sm:space-y-12" style={{ borderRadius: '8px' }}>

            {/* 1. Package Title */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                  1
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Package Title</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700 font-medium">Package Title (SEO Friendly)</Label>
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: 'Package title is required' }}
                  render={({ field }) => (
                    <input
                      id="title"
                      placeholder="e.g., 5 Days / 4 Nights Honeymoon Package in Exotic Kerala"
                      className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                      style={{ borderRadius: '6px' }}
                      {...field}
                    />
                  )}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>
            </div>

            {/* 2. Package Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                  2
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Package Type</h3>
              </div>
              <Controller
                name="packageType"
                control={control}
                render={({ field }) => (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => field.onChange('international')}
                        className={`px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                          field.value === 'international'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                            : 'bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                        }`}
                        style={{ borderRadius: '6px' }}
                      >
                        <Globe className="h-4 w-4" />
                        International
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('domestic')}
                        className={`px-5 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                          field.value === 'domestic'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 scale-[1.02]'
                            : 'bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                        }`}
                        style={{ borderRadius: '6px' }}
                      >
                        <Palmtree className="h-4 w-4" />
                        Domestic
                      </button>
                    </div>

                    {field.value === 'international' && (
                      <div className="space-y-3" ref={countryDropdownRef}>
                        <Label htmlFor="countrySearch">Country Name(s)</Label>
                        
                        {/* Selected Badges */}
                        {countryNames.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {countryNames.map((c: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-orange-50 text-orange-900 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold border border-orange-200 shadow-xs" style={{ borderRadius: '6px' }}>
                                {c}
                                <button
                                  type="button"
                                  onClick={() => removeCountry(c)}
                                  className="hover:bg-orange-200/70 rounded p-0.5 transition-colors focus:outline-none cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Input with Dropdown */}
                        <div className="relative">
                          <input
                            id="countrySearch"
                            placeholder="Type to search and add countries..."
                            value={countryInput}
                            onChange={(e) => {
                              setCountryInput(e.target.value);
                              setIsCountryDropdownOpen(true);
                            }}
                            onFocus={() => setIsCountryDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (countryInput.trim()) {
                                  addCountry(countryInput);
                                }
                              }
                            }}
                            className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                            style={{ borderRadius: '6px' }}
                          />
                          
                          {isCountryDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1" style={{ borderRadius: '6px' }}>
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((c) => (
                                  <div
                                    key={c}
                                    className="px-4 py-2.5 hover:bg-orange-50/60 hover:text-orange-950 cursor-pointer text-sm font-medium transition-colors"
                                    onClick={() => addCountry(c)}
                                  >
                                    {c}
                                  </div>
                                ))
                              ) : (
                                countryInput.trim() && (
                                  <div
                                    className="px-4 py-2.5 hover:bg-orange-50/60 cursor-pointer text-sm text-orange-600 font-semibold flex items-center gap-2"
                                    onClick={() => addCountry(countryInput)}
                                  >
                                    <Plus className="h-4 w-4" /> Add "{countryInput}"
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {field.value === 'domestic' && (
                      <div className="space-y-3" ref={stateDropdownRef}>
                        <Label htmlFor="stateSearch">State Name(s)</Label>
                        
                        {/* Selected Badges */}
                        {stateNames.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {stateNames.map((s: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-orange-50 text-orange-900 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold border border-orange-200 shadow-xs" style={{ borderRadius: '6px' }}>
                                {s}
                                <button
                                  type="button"
                                  onClick={() => removeState(s)}
                                  className="hover:bg-orange-200/70 rounded p-0.5 transition-colors focus:outline-none cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Input with Dropdown */}
                        <div className="relative">
                          <input
                            id="stateSearch"
                            placeholder="Type to search and add states..."
                            value={stateInput}
                            onChange={(e) => {
                              setStateInput(e.target.value);
                              setIsStateDropdownOpen(true);
                            }}
                            onFocus={() => setIsStateDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (stateInput.trim()) {
                                  addState(stateInput);
                                }
                              }
                            }}
                            className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                            style={{ borderRadius: '6px' }}
                          />
                          
                          {isStateDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1" style={{ borderRadius: '6px' }}>
                              {filteredStates.length > 0 ? (
                                filteredStates.map((s) => (
                                  <div
                                    key={s}
                                    className="px-4 py-2.5 hover:bg-orange-50/60 hover:text-orange-950 cursor-pointer text-sm font-medium transition-colors"
                                    onClick={() => addState(s)}
                                  >
                                    {s}
                                  </div>
                                ))
                              ) : (
                                stateInput.trim() && (
                                  <div
                                    className="px-4 py-2.5 hover:bg-orange-50/60 cursor-pointer text-sm text-orange-600 font-semibold flex items-center gap-2"
                                    onClick={() => addState(stateInput)}
                                  >
                                    <Plus className="h-4 w-4" /> Add "{stateInput}"
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Pick-up & Drop Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="h-4 w-1 rounded-full bg-orange-500"></div>
                  <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Pick-up Location</h3>
                </div>
                <Controller
                  name="pickUpLocation"
                  control={control}
                  render={({ field }) => (
                    <input
                      placeholder="e.g., Delhi Airport, Mumbai Central"
                      className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                      style={{ borderRadius: '6px' }}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="h-4 w-1 rounded-full bg-orange-500"></div>
                  <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Drop Location</h3>
                </div>
                <Controller
                  name="dropLocation"
                  control={control}
                  render={({ field }) => (
                    <input
                      placeholder="e.g., Delhi Airport, Mumbai Central"
                      className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                      style={{ borderRadius: '6px' }}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>

            {/* 3. Package Photos (Commented out - preserved)
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-sm shadow-sm border border-blue-100">
      3
    </div>
    <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Package Photos (Our Photos)</h3>
  </div>
              
              <div className="space-y-4">
                Upload Button
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer relative transition-all hover:border-orange-400">
                  <input
                    id="package-photos-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const currentPlace = placesCovered[0] || { id: 'photos', name: '', images: [], imageUrls: [] };
                      updatePlace(0, 'images', [...(currentPlace.images || []), ...files]);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Click or drag images to upload</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                </div>

                Previews and Existing Photos
                {((placesCovered[0]?.imageUrls?.length || 0) + (placesCovered[0]?.images?.length || 0)) > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 border p-4 rounded-xl bg-gray-50/50">
                    Existing uploaded images
                    {placesCovered[0]?.imageUrls?.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border bg-white group shadow-sm">
                        <img src={url} alt={`Package photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const currentUrls = placesCovered[0].imageUrls || [];
                            const updatedUrls = currentUrls.filter((_, i) => i !== idx);
                            updatePlace(0, 'imageUrls', updatedUrls);
                          }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <div className="bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform duration-200">
                            <Trash2 className="h-4 w-4" />
                          </div>
                        </button>
                      </div>
                    ))}

                    Newly selected image files
                    {placesCovered[0]?.images?.map((file, idx) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border bg-white group shadow-sm">
                          <img src={previewUrl} alt={`New package photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] text-white font-bold bg-orange-500/90 px-2 py-0.5 rounded-full shadow-sm">New</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const currentFiles = placesCovered[0].images || [];
                              const updatedFiles = currentFiles.filter((_, i) => i !== idx);
                              updatePlace(0, 'images', updatedFiles);
                            }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <div className="bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform duration-200">
                              <Trash2 className="h-4 w-4" />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            */}

            {/* 3. Tour Category */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                  3
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Tour Category</h3>
              </div>
              <Controller
                name="tourCategories"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {tourCategories.map((category) => {
                      const isSelected = (field.value || []).includes(category);
                      return (
                        <label
                          key={category}
                          className={`flex items-center space-x-2.5 p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                          }`}
                          style={{ borderRadius: '6px' }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentCategories = field.value || [];
                              const newCategories = checked
                                ? [...currentCategories, category]
                                : currentCategories.filter((c: string) => c !== category);
                              field.onChange(newCategories);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                          />
                          <span className="text-sm font-semibold">{category}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* 4 & 5. Hotel & Meal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    4
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Hotel Type</h3>
                </div>
                <Controller
                  name="hotelTypes"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {hotelTypes.map((type) => {
                        const isSelected = (field.value || []).includes(type.value);
                        return (
                          <label
                            key={type.value}
                            className={`flex items-center space-x-2.5 p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                            }`}
                            style={{ borderRadius: '6px' }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const currentTypes = field.value || [];
                                const newTypes = checked
                                  ? [...currentTypes, type.value]
                                  : currentTypes.filter((t: string) => t !== type.value);
                                field.onChange(newTypes);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                            />
                            <span className="text-sm font-semibold">{type.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    5
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Meal Plan</h3>
                </div>
                <Controller
                  name="mealPlan"
                  control={control}
                  render={({ field }) => {
                    const currentPlans: string[] = field.value || [];
                    const isNoMealSelected = currentPlans.includes('no-meal');
                    const isAllMealsSelected = currentPlans.includes('all-meals');

                    const visiblePlans = mealPlans.filter((plan) => {
                      if (isNoMealSelected) {
                        return plan.value === 'no-meal';
                      }
                      if (isAllMealsSelected) {
                        return plan.value === 'all-meals';
                      }
                      return true;
                    });

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {visiblePlans.map((plan) => {
                            const isSelected = currentPlans.includes(plan.value);
                            return (
                              <label
                                key={plan.value}
                                className={`flex items-center space-x-2.5 p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-orange-50/80 border-orange-300 text-orange-950 shadow-xs'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                style={{ borderRadius: '6px' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    let newPlans: string[] = [];

                                    if (checked) {
                                      if (plan.value === 'no-meal') {
                                        newPlans = ['no-meal'];
                                      } else if (plan.value === 'all-meals') {
                                        newPlans = ['all-meals'];
                                      } else {
                                        const filtered = currentPlans.filter(
                                          (p) => p !== 'no-meal' && p !== 'all-meals'
                                        );
                                        newPlans = [...filtered, plan.value];
                                      }
                                    } else {
                                      newPlans = currentPlans.filter((p) => p !== plan.value);
                                    }
                                    field.onChange(newPlans);
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400 accent-orange-500 cursor-pointer"
                                />
                                <span className="text-sm font-semibold">{plan.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            {/* 6. Itinerary Builder */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    6
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Itinerary Builder</h3>
                </div>
                <button
                  type="button"
                  onClick={addItineraryDay}
                  className="px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02] w-full sm:w-auto"
                  style={{ borderRadius: '6px' }}
                >
                  <Plus className="h-4 w-4" />
                  Add Day
                </button>
              </div>

              {itinerary.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-md bg-slate-50/50" style={{ borderRadius: '6px' }}>
                  <p className="text-slate-500 text-sm">No itinerary days added yet. Click "Add Day" to start.</p>
                </div>
              ) : (
                itinerary.map((day, index) => (
                  <Card key={day.id} className="border-l-4 border-l-amber-500 border-slate-200 rounded-md shadow-xs bg-white" style={{ borderRadius: '6px' }}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-semibold text-slate-800">Day {day.day}</h4>
                        <button
                          type="button"
                          onClick={() => removeItineraryDay(index)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer flex items-center gap-1"
                          style={{ borderRadius: '6px' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`dayPlace-${index}`}>Place Name</Label>
                          <input
                            id={`dayPlace-${index}`}
                            placeholder="Enter place name for this day"
                            value={day.placeName}
                            onChange={(e) => updateItineraryDay(index, 'placeName', e.target.value)}
                            className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                            style={{ borderRadius: '6px' }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`dayDescription-${index}`}>Description</Label>
                          <textarea
                            id={`dayDescription-${index}`}
                            placeholder="Describe what will happen on this day..."
                            value={day.description}
                            onChange={(e) => updateItineraryDay(index, 'description', e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                            style={{ borderRadius: '6px' }}
                          />
                        </div>

                        {/* Single Image Upload for Day */}
                        <div className="space-y-2">
                          <Label htmlFor={`dayPhoto-${index}`}>
                            Day Photo <span className="text-xs text-slate-500 font-normal">(1 photo)</span>
                          </Label>
                          <div className="space-y-2">
                            {((day.images && day.images.length > 0) || (day.imageUrls && day.imageUrls.length > 0) || day.imageUrl) ? (
                              <div className="relative border border-slate-200 rounded-md bg-slate-50/70 p-2.5 flex items-center gap-3 group" style={{ borderRadius: '6px' }}>
                                {day.images && day.images.length > 0 && day.images[0] ? (
                                  <div className="relative h-14 w-20 rounded-md overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs" style={{ borderRadius: '6px' }}>
                                    <img 
                                      src={day.images[0] instanceof File ? URL.createObjectURL(day.images[0]) : String(day.images[0])} 
                                      alt={`Day ${day.day}`} 
                                      className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">New</div>
                                  </div>
                                ) : (day.imageUrls && day.imageUrls.length > 0) || day.imageUrl ? (
                                  <div className="relative h-14 w-20 rounded-md overflow-hidden border border-slate-200 bg-white shrink-0 shadow-xs" style={{ borderRadius: '6px' }}>
                                    <img 
                                      src={day.imageUrls?.[0] || day.imageUrl} 
                                      alt={`Day ${day.day}`} 
                                      className="w-full h-full object-cover" 
                                    />
                                  </div>
                                ) : null}

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 truncate">
                                    {day.images && day.images.length > 0 && day.images[0]?.name ? day.images[0].name : 'Uploaded Day Photo'}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <label className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline">
                                      Change Photo
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            updateItineraryDay(index, { images: [file], imageUrls: [], imageUrl: '' });
                                          }
                                          e.target.value = '';
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                    <span className="text-slate-300 text-xs">•</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateItineraryDay(index, { images: [], imageUrls: [], imageUrl: '' });
                                      }}
                                      className="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 hover:underline"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed border-slate-300 rounded-md p-3 text-center hover:bg-slate-50 hover:border-orange-400 cursor-pointer relative transition-all" style={{ borderRadius: '6px' }}>
                                <input
                                  id={`dayPhoto-${index}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateItineraryDay(index, { images: [file], imageUrls: [], imageUrl: '' });
                                    }
                                    e.target.value = '';
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <Upload className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                                <span className="text-xs font-semibold text-slate-700 block">Click to upload 1 photo</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">PNG, JPG, WEBP</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 7. Package Duration */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                  7
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Package Duration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration Summary</Label>
                  <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-md" style={{ borderRadius: '6px' }}>
                    <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Calculated from itinerary:</div>
                    <div className="flex justify-between font-semibold text-sm text-slate-800">
                      <span>Total Days:</span>
                      <span className="text-orange-600 font-bold">{itinerary.length} Days</span>
                    </div>
                    <div className="flex justify-between font-semibold text-sm text-slate-800 mt-1">
                      <span>Total Nights:</span>
                      <span className="text-orange-600 font-bold">{itinerary.length > 0 ? itinerary.length - 1 : 0} Nights</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Starting Price */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                  8
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Starting Price</h3>
              </div>
              <Controller
                name="cost"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost">Starting Price (per person)</Label>
                      <input
                        id="cost"
                        type="number"
                        placeholder="Enter starting price"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                        style={{ borderRadius: '6px' }}
                      />
                    </div>
                  </div>
                )}
              />
            </div>

            {/* 9. Category Classification Details */}
            <div className="grid grid-cols-1 gap-6">
              {/* Experience Type */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    9
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Experience Type</h3>
                </div>
                <div className="space-y-3" ref={experienceDropdownRef}>
                  {/* Selected Badges */}
                  {experienceType.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {experienceType.map((exp: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-orange-50 text-orange-900 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold border border-orange-200 shadow-xs" style={{ borderRadius: '6px' }}>
                          {exp}
                          <button
                            type="button"
                            onClick={() => removeExperience(exp)}
                            className="hover:bg-orange-200/70 rounded p-0.5 transition-colors focus:outline-none cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input with Dropdown */}
                  <div className="relative">
                    <input
                      placeholder="Type to add or search..."
                      value={experienceInput}
                      onChange={(e) => setExperienceInput(e.target.value)}
                      onFocus={() => setIsExperienceDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (experienceInput.trim()) {
                            addExperience(experienceInput);
                          }
                        }
                      }}
                      className="w-full flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                      style={{ borderRadius: '6px' }}
                    />
                    
                    {isExperienceDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto" style={{ borderRadius: '6px' }}>
                        {filteredExperiences.length > 0 ? (
                          filteredExperiences.map((exp) => (
                            <div
                              key={exp}
                              className="px-4 py-2.5 hover:bg-orange-50/60 hover:text-orange-950 cursor-pointer text-sm font-medium transition-colors"
                              onClick={() => addExperience(exp)}
                            >
                              {exp}
                            </div>
                          ))
                        ) : (
                          experienceInput.trim() && (
                            <div
                              className="px-4 py-2.5 hover:bg-orange-50/60 cursor-pointer text-sm text-orange-600 font-semibold transition-colors flex items-center gap-2"
                              onClick={() => addExperience(experienceInput)}
                            >
                              <Plus className="h-4 w-4" /> Add "{experienceInput}"
                            </div>
                          )
                        )}
                        {filteredExperiences.length === 0 && !experienceInput.trim() && (
                          <div className="px-4 py-2 text-sm text-slate-500 italic">No more options</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seasonal and Events Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Season Getaways */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    10
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Seasonal Escapes</h3>
                </div>
                <Controller
                  name="season"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer"
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="">Select season</option>
                      <option value="summer">Summer Retreat (May - Jul)</option>
                      <option value="monsoon">Monsoon Magic (Aug - Oct)</option>
                      <option value="winter">Winter Wonderland (Nov - Jan)</option>
                      <option value="spring">Spring Getaway (Feb - Apr)</option>
                      <option value="all-seasons">All Seasons</option>
                    </select>
                  )}
                />
              </div>

              {/* Festive & Event Specials */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-orange-600 font-bold text-sm shadow-xs border border-orange-100" style={{ borderRadius: '6px' }}>
                    11
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Festive & Event Specials</h3>
                </div>
                <Controller
                  name="eventType"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer"
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="">Select festival/event</option>
                      <option value="new-year">New Year & Christmas Specials</option>
                      <option value="diwali">Diwali Specials</option>
                      <option value="summer-vacation">Summer Vacations</option>
                      <option value="weekend">Long Weekend Escapes</option>
                    </select>
                  )}
                />
              </div>
            </div>

            {/* 13. Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inclusions */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-semibold">12. Inclusions</h3>
                  <button
                    type="button"
                    onClick={addInclusion}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm border border-amber-400/50 hover:scale-[1.02]"
                    style={{ borderRadius: '6px' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {inclusions.map((item, index) => (
                    <div key={`inclusion-${index}`} className="flex items-center gap-2">
                      <input
                        placeholder="e.g. 3 Star hotel stay, daily breakfast..."
                        value={item}
                        onChange={(e) => updateInclusion(index, e.target.value)}
                        className="flex-1 flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                        style={{ borderRadius: '6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeInclusion(index)}
                        disabled={inclusions.length <= 1 && item === ''}
                        className="h-10 w-10 shrink-0 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderRadius: '6px' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclusions */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-semibold">13. Exclusions</h3>
                  <button
                    type="button"
                    onClick={addExclusion}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm border border-amber-400/50 hover:scale-[1.02]"
                    style={{ borderRadius: '6px' }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {exclusions.map((item, index) => (
                    <div key={`exclusion-${index}`} className="flex items-center gap-2">
                      <input
                        placeholder="e.g. Laundry, personal tips, flights..."
                        value={item}
                        onChange={(e) => updateExclusion(index, e.target.value)}
                        className="flex-1 flex h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-xs"
                        style={{ borderRadius: '6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExclusion(index)}
                        disabled={exclusions.length <= 1 && item === ''}
                        className="h-10 w-10 shrink-0 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:shadow-xs hover:scale-[1.02] transition-all duration-200 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderRadius: '6px' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6 border-t">
              <div className="text-xs sm:text-sm text-gray-600">
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
              
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCancelWithConfirmation}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-white hover:text-slate-900 hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]"
                  style={{ borderRadius: '6px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  style={{ borderRadius: '6px' }}
                >
                  {isSubmitting ? 'Submitting...' : initialData ? 'Update Listing' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </form>
    </div>
  );
}