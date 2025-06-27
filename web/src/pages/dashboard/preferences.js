import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Palette, Type } from 'lucide-react';
import { TwitterPicker } from 'react-color';

export default function PreferencesPage({ user, initialPrefs }) {
    const [prefs, setPrefs] = useState(initialPrefs);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleColorChange = (key, color) => {
        setPrefs(prev => ({ ...prev, [key]: color.hex }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveMessage('');
        const prefDocRef = doc(db, 'userPreferences', user.id);
        try {
            await setDoc(prefDocRef, prefs, { merge: true });
            setSaveMessage('Preferences saved successfully!');
        } catch (error) {
            console.error("Error saving preferences:", error);
            setSaveMessage('Failed to save preferences.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center text-neutral-400 hover:text-white mb-8 transition-colors text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </Link>

                <div className="animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">My Preferences</h1>
                    <p className="text-neutral-400 mb-8">Customize your experience in the ticket panel.</p>

                    <div className="bg-neutral-900 rounded-lg shadow-lg p-6 border border-neutral-800 space-y-8">
                        {/* Bubble Color Setting */}
                        <div className="flex flex-col sm:flex-row sm:items-start">
                            <Palette className="h-5 w-5 mt-1 mr-4 text-neutral-500 flex-shrink-0"/>
                            <div className="w-full">
                                <h2 className="text-lg font-bold mb-2">Staff Message Color</h2>
                                <p className="text-sm text-neutral-400 mb-4">Choose the background color for messages you send in tickets.</p>
                                <TwitterPicker
                                    color={prefs.staffBubbleColor || '#5865F2'}
                                    onChangeComplete={(color) => handleColorChange('staffBubbleColor', color)}
                                    triangle="hide"
                                    colors={['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#F2994A', '#FFFFFF', '#99AAB5', '#2C2F33']}
                                    styles={{
                                        default: {
                                            card: { backgroundColor: 'transparent', boxShadow: 'none' },
                                            input: { backgroundColor: '#333', color: 'white', boxShadow: 'none' },
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Text Color Setting */}
                        <div className="flex flex-col sm:flex-row sm:items-start">
                            <Type className="h-5 w-5 mt-1 mr-4 text-neutral-500 flex-shrink-0"/>
                            <div className="w-full">
                                <h2 className="text-lg font-bold mb-2">Staff Text Color</h2>
                                <p className="text-sm text-neutral-400 mb-4">Choose the text color for messages you send.</p>
                                <TwitterPicker
                                    color={prefs.staffTextColor || '#FFFFFF'}
                                    onChangeComplete={(color) => handleColorChange('staffTextColor', color)}
                                    triangle="hide"
                                    colors={['#FFFFFF', '#E0E0E0', '#BDBDBD', '#1F2937', '#000000']}
                                    styles={{
                                        default: {
                                            card: { backgroundColor: 'transparent', boxShadow: 'none' },
                                            input: { backgroundColor: '#333', color: 'white', boxShadow: 'none' },
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end items-center">
                        {saveMessage && (
                            <p className={`mr-4 text-sm ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                                {saveMessage}
                            </p>
                        )}
                        <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-900/50 disabled:cursor-wait transition-colors font-semibold"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);
    if (!session) {
        return { redirect: { destination: '/', permanent: false } };
    }

    const prefDocRef = doc(db, 'userPreferences', session.user.id);
    const prefDocSnap = await getDoc(prefDocRef);
    const defaultPrefs = { staffBubbleColor: '#5865F2', staffTextColor: '#FFFFFF' };
    const initialPrefs = prefDocSnap.exists() ? { ...defaultPrefs, ...prefDocSnap.data() } : defaultPrefs;

    return {
        props: {
            user: session.user,
            initialPrefs,
        },
    };
}
