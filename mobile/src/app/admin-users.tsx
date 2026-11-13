import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { AdminBottomNav } from '../components/AdminBottomNav';
import { api, type Profile } from '../services/api';

type UserFilter = 'All' | 'Learners' | 'Content Creators' | 'SMMEs';

const userFilters: UserFilter[] = ['All', 'Learners', 'Content Creators', 'SMMEs'];

function roleMatchesFilter(user: Profile, filter: UserFilter) {
  if (filter === 'All') return true;
  if (filter === 'Learners') return user.role === 'learner';
  if (filter === 'Content Creators') return user.role === 'trainer';
  return user.role === 'employer';
}

function roleLabel(role: string) {
  if (role === 'learner') return 'Learner';
  if (role === 'trainer') return 'Content creator';
  if (role === 'employer') return 'SMME';
  return 'Administrator';
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'U';
}

function profileDescription(user: Profile) {
  const detail = user.category || user.primaryInterest || user.province;
  return detail ? `${roleLabel(user.role)} · ${detail}` : roleLabel(user.role);
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('All');
  const [showAdministrators, setShowAdministrators] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers(refresh = false) {
    setError('');
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await api.admin.users();
      setUsers(result.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load registered users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    void api.admin.users()
      .then((result) => {
        if (active) setUsers(result.users);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load registered users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users
      .filter((user) => {
        const roleMatches = user.role === 'admin'
          ? filter === 'All' && showAdministrators
          : roleMatchesFilter(user, filter);
        const searchMatches = !query
          || `${user.name} ${user.email} ${user.id} ${user.category} ${user.primaryInterest} ${user.province}`
            .toLocaleLowerCase().includes(query);
        return roleMatches && searchMatches;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filter, search, showAdministrators, users]);

  return (
    <View className="flex-1 bg-[#F7F7F2] dark:bg-[#101814]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-5 pt-12"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void loadUsers(true); }} />}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[22px] font-extrabold leading-7 text-[#252B27] dark:text-[#F1F4F1]">User management</Text>
            <Text className="mt-1 text-[9px] text-[#78817B] dark:text-[#AAB6AD]">
              {loading ? 'Loading registered users…'
                : error ? 'Registered user count unavailable'
                  : `${users.length.toLocaleString()} registered users`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showAdministrators ? 'Hide administrator accounts' : 'Show administrator accounts'}
            accessibilityState={{ selected: showAdministrators }}
            onPress={() => setShowAdministrators((current) => !current)}
            className={`h-9 w-9 items-center justify-center rounded-full border ${showAdministrators ? 'border-[#B6CDBB] bg-[#E8F0E7] dark:border-[#42664F] dark:bg-[#23362A]' : 'border-[#E0E5DF] bg-white dark:border-[#35443A] dark:bg-[#1D2922]'}`}
          >
            <Text className="text-base text-[#14543E]">▽</Text>
          </Pressable>
        </View>

        <View className="mt-5 h-10 flex-row items-center rounded-xl border border-[#E1E5DF] bg-white px-3 dark:border-[#35443A] dark:bg-[#1D2922]">
          <Text className="mr-2 text-base text-[#78817B]">⌕</Text>
          <TextInput
            accessibilityLabel="Search users by name, email or ID"
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email or ID..."
            placeholderTextColor="#A0A7A1"
            className="h-full flex-1 text-[10px] text-[#252B27] dark:text-[#F1F4F1]"
            returnKeyType="search"
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear user search" onPress={() => setSearch('')}>
              <Text className="px-1 text-lg text-[#78817B]">×</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-2 flex-row rounded-xl bg-[#E9ECE7] p-1 dark:bg-[#1D2922]">
          {userFilters.map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item)}
                className={`h-7 flex-1 items-center justify-center rounded-lg ${selected ? 'bg-white shadow-sm dark:bg-[#35443A]' : ''}`}
              >
                <Text className={`text-[8px] font-semibold ${selected ? 'text-[#14543E] dark:text-[#B7E2C2]' : 'text-[#67716A] dark:text-[#AAB6AD]'}`}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {filter === 'All' ? (
          <View className="mt-2 flex-row items-center rounded-lg bg-[#E8F0E7] px-3 py-2 dark:bg-[#23362A]">
            <Text className="text-[9px] font-semibold text-[#14543E] dark:text-[#B7E2C2]">
              {showAdministrators ? 'Administrator accounts are included in All.' : 'Administrator accounts are hidden from All.'}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mt-4 rounded-xl border border-[#F0D1C8] bg-white p-4 dark:bg-[#1D2922]">
            <Text accessibilityRole="alert" className="text-[10px] leading-4 text-[#9A382C]">{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void loadUsers(); }} className="mt-3 self-start rounded-lg bg-[#14543E] px-4 py-2">
              <Text className="text-[9px] font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4">
          {loading ? (
            <Text className="py-4 text-[10px] text-[#78817B] dark:text-[#AAB6AD]">Loading users…</Text>
          ) : error ? null : filteredUsers.length ? (
            filteredUsers.map((user, index) => (
              <View key={user.id} className={`min-h-[65px] flex-row items-center py-2 ${index > 0 ? 'border-t border-[#DDE3DD] dark:border-[#35443A]' : ''}`}>
                <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-full bg-[#E8F0E7]">
                  <Text className="text-[9px] font-extrabold text-[#14543E]">{initials(user.name)}</Text>
                </View>
                <View className="flex-1 pr-2">
                  <Text numberOfLines={1} className="text-[10px] font-bold text-[#252B27] dark:text-[#F1F4F1]">{user.name}</Text>
                  <Text numberOfLines={1} className="mt-1 text-[8px] text-[#78817B] dark:text-[#AAB6AD]">{profileDescription(user)}</Text>
                </View>
                <Text className="rounded-full bg-[#E8F0E7] px-2 py-1 text-[7px] font-bold text-[#477E62]">Registered</Text>
                <Text accessibilityElementsHidden className="ml-2 text-base text-[#526058]">›</Text>
              </View>
            ))
          ) : (
            <View className="items-center py-10">
              <Text className="text-[11px] font-bold text-[#34483A]">No users found</Text>
              <Text className="mt-1 text-center text-[9px] text-[#78817B]">Try another search or choose a different role.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AdminBottomNav active="Users" />
    </View>
  );
}
