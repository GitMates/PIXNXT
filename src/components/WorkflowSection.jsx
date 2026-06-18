import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Typography } from './ui/Typography';
import { Container } from './ui/Container';

const categories = [
    { id: 'wedding', name: 'Wedding', image: '/workflow-wedding.jpg', alt: 'Wedding Photography' },
    { id: 'portrait', name: 'Portrait', image: '/workflow-portrait.jpg', alt: 'Portrait Photography' },
    { id: 'family', name: 'Family', image: '/workflow-family.jpg', alt: 'Family Photography' },
    { id: 'seniors', name: 'Seniors', image: '/workflow-seniors.jpg', alt: 'Senior Photography' },
    { id: 'events', name: 'Events', image: '/workflow-events.jpg', alt: 'Event Photography' },
    { id: 'adventure', name: 'Adventure', image: '/workflow-adventure.jpg', alt: 'Adventure Photography' },
    { id: 'commercial', name: 'Commercial', image: '/workflow-commercial.jpg', alt: 'Commercial Photography' },
];

const WorkflowSection = () => {
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return (
        <section className="bg-white py-24 md:py-32">
            <Container size="landing">
                <div className="mb-16 max-w-2xl">
                    <Typography 
                      variant="label" 
                      className="mb-4 block"
                    >
                      DESIGNED FOR EVERY WORKFLOW
                    </Typography>
                    <Typography 
                      variant="h2" 
                      className="mb-6 text-4xl md:text-5xl"
                    >
                      Made for all photographers.
                    </Typography>
                    <Typography 
                      variant="p" 
                      className="text-lg text-muted-foreground"
                    >
                        From weddings to landscapes and everything in between, Pixnxt is built to elevate your business—and make your work look its best.
                    </Typography>
                </div>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100 lg:aspect-square">
                        <img
                            key={activeCategory.id}
                            src={activeCategory.image}
                            alt={activeCategory.alt}
                            className="h-full w-full object-cover transition-opacity duration-700"
                        />
                    </div>
                    
                    <ul className="flex flex-col gap-2">
                        {categories.map((category) => (
                            <li
                                key={category.id}
                                onMouseEnter={() => setActiveCategory(category)}
                                className={cn(
                                  "cursor-pointer py-4 text-2xl md:text-3xl font-light tracking-tight transition-all duration-300 border-b border-zinc-100",
                                  activeCategory.id === category.id 
                                    ? "text-zinc-950 font-medium pl-4 border-zinc-950" 
                                    : "text-zinc-400 hover:text-zinc-600 hover:pl-2"
                                )}
                            >
                                {category.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </Container>
        </section>
    );
};

export default WorkflowSection;
