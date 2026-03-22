import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";

const PricingPage = () => {
  return (
    <div className="min-h-screen landing-dark">
      <Navbar />
      <div className="pt-24">
        <PricingSection />
      </div>
      <FooterSection />
    </div>
  );
};

export default PricingPage;
