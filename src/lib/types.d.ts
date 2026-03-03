declare global {
	// eslint-disable-next-line ts/consistent-type-definitions
	interface RegExpConstructor {
		escape(string_: string): string
	}
}
