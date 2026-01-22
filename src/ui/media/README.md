# Media Components

Components for displaying images, avatars, and carousels.

## Files

- **avatar.tsx** - User avatar with fallback
- **carousel.tsx** - Image carousel/slider
- **index.ts** - Barrel export

## Usage

### Avatar
```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/ui';

<Avatar>
  <AvatarImage src="https://github.com/username.png" alt="@username" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>

// With different sizes
<Avatar className="h-8 w-8">
  <AvatarImage src="/avatar.jpg" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

<Avatar className="h-12 w-12">
  <AvatarImage src="/avatar.jpg" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Carousel
```tsx
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/ui';

<Carousel className="w-full max-w-xs">
  <CarouselContent>
    <CarouselItem>
      <img src="/image1.jpg" alt="Image 1" />
    </CarouselItem>
    <CarouselItem>
      <img src="/image2.jpg" alt="Image 2" />
    </CarouselItem>
    <CarouselItem>
      <img src="/image3.jpg" alt="Image 3" />
    </CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>

// With options
<Carousel
  opts={{
    align: "start",
    loop: true,
  }}
>
  {/* ... */}
</Carousel>
```

## Avatar Best Practices

- Always provide a fallback (initials or icon)
- Use consistent sizes across your app
- Ensure images are square for proper display
- Consider loading states for remote images

## Carousel Best Practices

- Keep images consistent in size and aspect ratio
- Enable loop for continuous browsing
- Add indicators for multiple items
- Consider autoplay for hero sections
- Ensure touch/swipe support on mobile
