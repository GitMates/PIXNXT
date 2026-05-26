import React from 'react';
import { cn } from '../lib/utils';
import { Typography } from './ui/Typography';
import { Container } from './ui/Container';

const ParallaxProofing = () => {
    return (
        <section 
          className="relative min-h-[70vh] flex items-center py-24 md:py-32 bg-cover bg-center bg-no-repeat transition-all md:bg-fixed"
          style={{ backgroundImage: "url('/proofing-bg.png')" }}
        >
            {/* Dark Overlay */}
            <div className="absolute inset-0 z-10 bg-black/40" />

            <Container className="relative z-20 flex flex-col items-center md:items-end">
                <div className="max-w-2xl text-white">
                    <Typography 
                      variant="h2" 
                      className="mb-8 text-white text-4xl md:text-7xl font-light font-heading leading-tight"
                    >
                      Photo proofing<br />for professionals
                    </Typography>
                    <Typography 
                      variant="p" 
                      className="mb-10 text-lg md:text-xl text-white/90 font-light leading-relaxed"
                    >
                        A photo sharing platform you and your clients will love. View, select and communicate all online. Enable watermarks, downloads, favorites and password protection.
                    </Typography>
                    <button className="px-10 py-4 text-[12px] font-bold uppercase tracking-widest border border-white/30 hover:bg-white hover:text-black transition-all">
                      Learn More
                    </button>
                </div>
            </Container>
        </section>
    );
};

export default ParallaxProofing;
