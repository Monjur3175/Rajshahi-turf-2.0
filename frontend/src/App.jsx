import { useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Booking from "./components/Booking.jsx";
import ScrollTop from "./components/ScrollTop.jsx";
import { Steps, Prices, Find, Faq, Footer } from "./components/Static.jsx";

export default function App() {
  // A booking made in the chat is passed to the calendar so it can jump to that day and refresh.
  const [chatBooking, setChatBooking] = useState(null);
  return (
    <>
      <Navbar />
      <Hero onBooking={setChatBooking} />
      <main>
        <Steps />
        <Booking chatBooking={chatBooking} />
        <Prices />
        <Find />
        <Faq />
      </main>
      <Footer />
      <ScrollTop />
    </>
  );
}
