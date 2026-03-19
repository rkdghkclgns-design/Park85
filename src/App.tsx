import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Services } from "./components/Services";
import { EventBanners } from "./components/EventBanners";
import { ServiceSelection } from "./components/ServiceSelection";
import { SuitableSpaces } from "./components/SuitableSpaces";
import { HowItWorks } from "./components/HowItWorks";
import { Testimonials } from "./components/Testimonials";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { ClientLogos } from "./components/ClientLogos";
import { ScrollToTop } from "./components/ScrollToTop";
import { ServiceDetail } from "./components/ServiceDetail";

function HomePage() {
    return (
        <>
            <Hero />
            <div className="h-px bg-gray-100 w-full" />
            <Services />
            <div className="h-px bg-gray-100 w-full" />
            <ServiceSelection />
            <div className="h-px bg-gray-100 w-full" />
            <SuitableSpaces />
            <div className="h-px bg-gray-100 w-full" />
            <HowItWorks />
            <div className="h-px bg-gray-100 w-full" />
            <Features />
            <div className="h-px bg-gray-100 w-full" />
            <Testimonials />
            <div className="h-px bg-gray-100 w-full" />
            <ClientLogos />
            <div className="h-px bg-gray-100 w-full" />
            <EventBanners />
            <div className="h-px bg-gray-100 w-full" />
            <CTA />
        </>
    );
}

export default function App() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <div className="h-px bg-gray-100 w-full" />
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/service/:categoryId/:serviceId" element={<ServiceDetail />} />
            </Routes>
            <Footer />
            <CartDrawer />
            <ScrollToTop />
        </div>
    );
}
