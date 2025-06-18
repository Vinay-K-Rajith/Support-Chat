import { Mail, Globe, GraduationCap, BookOpen, Users, Bell } from "lucide-react";
import { ChatButton } from "@/components/chatbot/chat-button";

export default function Home() {
  return (
    <div className="font-inter bg-gray-50 min-h-screen">
      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* School Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center">
              <img 
                src="https://images.unsplash.com/photo-1562774053-701939374585?w=1280&h=480&fit=crop" 
                alt="St. Xavier's School Campus" 
                className="w-full h-48 object-cover rounded-lg mb-6" 
              />
              
              <h1 className="text-4xl font-bold text-school-deep mb-2">
                St. Xavier's School, Bathinda
              </h1>
              <p className="text-gray-600 text-lg mb-4">Excellence in Education Since 1983</p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  contactsaintxaviersbathinda@gmail.com
                </span>
                <span className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  www.xavierbathinda.com
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-school-blue text-3xl mb-4">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Admissions 2025-26</h3>
              <p className="text-gray-600 text-sm">
                Nursery & LKG admissions now open. Registration fee: ₹1,000
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-school-orange text-3xl mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">CBSE Curriculum</h3>
              <p className="text-gray-600 text-sm">
                English medium with emphasis on Punjabi, Hindi & Sanskrit
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="text-green-600 text-3xl mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Holistic Development</h3>
              <p className="text-gray-600 text-sm">
                Academic excellence with moral & intellectual growth
              </p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-r from-school-blue to-school-deep text-white rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Bell className="w-6 h-6 mr-3" />
              Important Notice
            </h2>
            <div className="space-y-2">
              <p><strong>Nursery:</strong> DOB from 01.04.2021 to 31.03.2022</p>
              <p><strong>LKG:</strong> DOB from 01.04.2020 to 31.03.2021</p>
              <p className="text-sm mt-4 opacity-90">
                Have questions? Use our AI assistant to get instant answers about admissions, fees, and school policies!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <ChatButton />
    </div>
  );
}
