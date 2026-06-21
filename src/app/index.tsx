import { Redirect } from 'expo-router';
import ScreenMapSuccess from './Screen/Map/ScreenMapSuccess';
export default function HomeScreen() {
  //return <Redirect href="/Screen/Login/ScreenStart" />;  //aqui cambie para poner el screen del mapa
  return <Redirect href="/Screen/Map/ScreenMapSuccess" />
}