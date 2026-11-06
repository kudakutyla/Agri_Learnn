import { Pressable, Text } from 'react-native';

export function Button({ label, onPress, secondary = false, gold = false, disabled = false }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  gold?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 items-center justify-center rounded-[14px] px-5 ${secondary ? 'border border-white/25 bg-white/5' : gold ? 'bg-[#D6A84B]' : 'bg-agrilearn-green'} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-sm font-bold ${secondary ? 'text-white' : gold ? 'text-[#103D2B]' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}
