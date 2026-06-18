import React from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Typography } from './ui/Typography';
import { Container } from './ui/Container';

const Hero = () => {
    return (
        <section className="relative h-screen min-h-[600px] w-full overflow-hidden bg-zinc-950">
            {/* Video Background Overlay */}
            <div className="absolute inset-0 z-10 bg-black/40" />
            
            <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src="/hero-video.mp4" type="video/mp4" />
            </video>

            <Container size="landing" className="relative z-20 flex h-full items-center justify-start">
                <div className="w-full max-w-2xl xl:max-w-3xl">
                    <Typography 
                      variant="label" 
                      className="mb-6 block text-white/70 animate-fade-in"
                    >
                      PIXNXT PHOTOGRAPHER PLATFORM
                    </Typography>
                    
                    <Typography 
                      variant="h1" 
                      className="mb-8 text-white text-5xl md:text-7xl xl:text-8xl leading-[1.1]"
                    >
                        Designed for photographers.<br />
                        Built to help you grow.
                    </Typography>
                    
                    <Typography 
                      variant="p" 
                      className="mb-12 text-lg text-white/80 md:text-xl font-light leading-relaxed"
                    >
                        Industry-leading photo galleries, website and business tools to streamline your workflow and grow your photography business.
                    </Typography>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button size="lg" className="rounded-none px-12 h-14 uppercase tracking-widest text-xs font-bold">
                          Get Started
                        </Button>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default Hero;
