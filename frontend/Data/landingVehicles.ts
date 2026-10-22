export interface LandingVehicle {
  id: string;
  listingType: "buy" | "rent";
  name: string;
  category: "SUV" | "Sedan" | "Hatchback" | "Truck" | "Van" | "Coupe";
  transmission: "Automatic" | "Manual";
  fuel: "Petrol" | "Diesel" | "Hybrid" | "Electric";
  price: number;
  distance: number;
  image: string;
  featured?: boolean;
}

export const landingVehicles: LandingVehicle[] = [
  {
    id: "toyota-axio-2018",
    listingType: "buy",
    name: "Toyota Axio 2018",
    category: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 11500,
    distance: 2.4,
    image: "/images/pexels-drphotographer152-29458514.jpg",
    featured: true,
  },
  {
    id: "honda-fit-2017",
    listingType: "rent",
    name: "Honda Fit 2017",
    category: "Hatchback",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 9800,
    distance: 3.1,
    image: "/images/pexels-ruvim-1807011-3541550.jpg",
  },
  {
    id: "mazda-demio-2016",
    listingType: "rent",
    name: "Mazda Demio 2016",
    category: "Hatchback",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 8800,
    distance: 5.6,
    image: "/images/pexels-marino-kurunic-814205362-33567290.jpg",
  },
  {
    id: "mercedes-c200-2016",
    listingType: "buy",
    name: "Mercedes C200 2016",
    category: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    price: 16900,
    distance: 8.3,
    image: "/images/pexels-enesozkul-36989262.jpg",
  },
  {
    id: "toyota-hilux-2019",
    listingType: "buy",
    name: "Toyota Hilux 2019",
    category: "Truck",
    transmission: "Manual",
    fuel: "Diesel",
    price: 26600,
    distance: 7.2,
    image: "/images/pexels-sofianunezph-19143577.jpg",
  },
];
