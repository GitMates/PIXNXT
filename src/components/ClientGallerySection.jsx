import React from 'react';
import './ClientGallerySection.css';

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
        <section className="client-gallery-section" id="products">
            <div className="cg-hero-container container">
                <div className="cg-intro">
                    <h2 className="cg-title">Beautiful client photo galleries<br />for modern photographers.</h2>
                    <p className="cg-subtitle">The better way to share, deliver, proof and sell photos online.</p>
                    <button className="btn-primary cg-btn">Get Started</button>
                </div>

                <div className="cg-main-image-wrapper">
                    <img src="/image.png" alt="Client Gallery Main" className="cg-main-image" />
                </div>
            </div>

            <div className="cg-impress-section container">
                <h3 className="cg-impress-title">Designed to impress.</h3>
                <p className="cg-impress-subtitle">Effortlessly create stunning, dedicated online photo galleries for each of your clients, complete with beautiful covers and layouts.</p>

                <div className="cg-pills">
                    <button className="cg-pill active">Wedding & Portrait</button>
                    <button className="cg-pill">Sports & Events</button>
                    <button className="cg-pill">Commercial</button>
                    <button className="cg-pill">Adventure</button>
                </div>

                <div className="cg-static-grid">
                    {examplesData.map(item => (
                        <a href={item.link} key={item.id} className="cg-grid-item" target="_blank" rel="noopener noreferrer">
                            <div className="cg-grid-image-wrapper">
                                <img src={item.imageUrl} alt={item.title} className="cg-grid-image" />
                                <div className="cg-hover-overlay">
                                    <span className="cg-view-btn">View Gallery</span>
                                </div>
                            </div>
                            <div className="cg-grid-meta">
                                <h4>{item.title}</h4>
                                <p>{item.subtitle}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ClientGallerySection;
