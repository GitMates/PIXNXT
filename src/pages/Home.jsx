import React from 'react';
import Hero from '../components/Hero';
import ClientGallerySection from '../components/ClientGallerySection';
import ParallaxProofing from '../components/ParallaxProofing';
import WorkflowSection from '../components/WorkflowSection';

const Home = () => {
    return (
        <main>
            <Hero />

            {/* New Client Gallery Section */}
            <ClientGallerySection />

            {/* Parallax Proofing Section */}
            <ParallaxProofing />

            {/* Workflow Section */}
            <WorkflowSection />

        </main>
    );
};

export default Home;
