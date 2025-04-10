import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MainRouting from './src/components/MainRouding';
import AppNavigator from './src/components/MainRouding';



export default function App() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                {/* <MainRouting/> */}
                <AppNavigator/>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}