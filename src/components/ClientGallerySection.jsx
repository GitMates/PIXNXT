import React from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Typography } from './ui/Typography';
import { Container } from './ui/Container';

const examplesData = [
    {
        id: 1,
        imageUrl: '/IMG_86EC5274F10E-1.jpeg',
        title: 'Abix Vinoth',
        subtitle: 'Wedding',
        link: 'https://gallery.karakovan.in/abixvinoth/'
    },
    {
        id: 2,
        imageUrl: '/IMG_7124ABA10F41-1.jpeg',
        title: 'Akshayam',
        subtitle: 'Commercial',
        link: 'https://gallery.karakovan.in/akshayam/'
    },
    {
        id: 3,
        imageUrl: '/IMG_E9FAD63B919A-1.jpeg',
        title: 'PV',
        subtitle: 'Portrait',
        link: 'https://gallery.karakovan.in/pv/'
    }
];

const ClientGallerySection = () => {
    return (
        <section className="bg-white py-24 md:py-32" id="products">
            <Container>
                {/* Intro Hero-like section */}
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
                    <div className="max-w-2xl">
                        <Typography 
                          variant="h2" 
                          className="mb-6 leading-tight text-4xl md:text-6xl font-heading"
                        >
                          Beautiful client photo galleries<br />for modern photographers.
                        </Typography>
                        <Typography 
                          variant="p" 
                          className="mb-10 text-xl text-muted-foreground"
                        >
                          The better way to share, deliver, proof and sell photos online.
                        </Typography>
                        <Button size="lg" className="rounded-none uppercase tracking-widest text-xs font-bold px-12">
                          Get Started
                        </Button>
                    </div>

                    <div className="relative aspect-video overflow-hidden bg-zinc-50 shadow-2xl">
                        <img src="/image.png" alt="Client Gallery Main" className="h-full w-full object-cover" />
                    </div>
                </div>

                {/* Impress Section */}
                <div className="mt-32 md:mt-48">
                    <div className="mb-16 max-w-2xl">
                        <Typography variant="h3" className="mb-6 text-3xl font-heading">Designed to impress.</Typography>
                        <Typography variant="p" className="text-lg text-muted-foreground">
                          Effortlessly create stunning, dedicated online photo galleries for each of your clients, complete with beautiful covers and layouts.
                        </Typography>
                    </div>

                    {/* Filter Pills */}
                    <div className="mb-12 flex flex-wrap gap-3">
                        <Pill active>Wedding & Portrait</Pill>
                        <Pill>Sports & Events</Pill>
                        <Pill>Commercial</Pill>
                        <Pill>Adventure</Pill>
                    </div>

                    {/* Example Grid */}
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {examplesData.map(item => (
                            <a 
                              href={item.link} 
                              key={item.id} 
                              className="group flex flex-col gap-4" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.title} 
                                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-500 group-hover:bg-black/20">
                                        <span className="translate-y-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                                          View Gallery
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Typography variant="h4" className="text-sm font-bold uppercase tracking-tight">{item.title}</Typography>
                                    <Typography variant="label" className="text-[10px]">{item.subtitle}</Typography>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </Container>
        </section>
    );
};

function Pill({ children, active }) {
  return (
    <button className={cn(
      "px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border-b-2",
      active 
        ? "border-zinc-950 text-zinc-950" 
        : "border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200"
    )}>
      {children}
    </button>
  );
}

export default ClientGallerySection;
