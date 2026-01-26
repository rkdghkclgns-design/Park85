import { Header } from "./components/Header";
import { QuickQuote } from "./components/QuickQuote";
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
            <div className="pt-48"> {/* Add padding top to account for fixed header if needed, or place QuickQuote appropriately */}
                <QuickQuote />
            </div>
            <Hero />
            <Features />
            <Services />
            <EventBanners />
            <ServiceSelection />
            <SuitableSpaces />
            <HowItWorks />
            <Testimonials />
            <CTA />
            <Footer />
            <CartDrawer />
        </div>
    );
}
