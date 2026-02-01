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

export default function App() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <Hero />
            <Services />
            <ServiceSelection />
            <SuitableSpaces />
            <HowItWorks />
            <Features />
            <Testimonials />
            <EventBanners />
            <CTA />
            <Footer />
            <CartDrawer />
        </div>
    );
}
