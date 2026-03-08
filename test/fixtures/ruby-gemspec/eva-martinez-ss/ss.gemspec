# frozen_string_literal: true

require_relative "lib/ss/version"

Gem::Specification.new do |spec|
  spec.name = "ss"
  spec.version = Ss::VERSION
  spec.authors = ["Eva Martínez Bencomo"]
  spec.email = ["72278710+Eva-Martinez@users.noreply.github.com"]

  spec.summary = "Gema para agrupar las clases, constantes y métodos para la gestión de un servicio sanitario."
  spec.description = "La gema contiene tres clases, cinco constantes y tres métodos. Una clase para representar un nivel del SET, una para la hora y una para la fecha. Las constantes son los niveles del SET. Y los métodos son uno para la diferencia en días, meses y años entre dos fechas; uno para la diferencia en horas, minutos y segundos; y uno que devuelva según la hora de entrada y la actual un nivel de prioridad."
  spec.homepage = "https://github.com/ULL-ESIT-LPP-2425/07-poo-eva-martinez-bencomo-alu0101396385.git"
  spec.required_ruby_version = ">= 3.0.0"

  spec.metadata["allowed_push_host"] = "https://github.com/ULL-ESIT-LPP-2425/07-poo-eva-martinez-bencomo-alu0101396385.git"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/ULL-ESIT-LPP-2425/07-poo-eva-martinez-bencomo-alu0101396385.git"
  spec.metadata["changelog_uri"] = "https://github.com/ULL-ESIT-LPP-2425/07-poo-eva-martinez-bencomo-alu0101396385.git"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  gemspec = File.basename(__FILE__)
  spec.files = IO.popen(%w[git ls-files -z], chdir: __dir__, err: IO::NULL) do |ls|
    ls.readlines("\x0", chomp: true).reject do |f|
      (f == gemspec) ||
        f.start_with?(*%w[bin/ test/ spec/ features/ .git .github appveyor Gemfile])
    end
  end
  spec.bindir = "exe"
  spec.executables = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # Uncomment to register a new dependency of your gem
  spec.add_dependency "bundle"
  spec.add_dependency "rake"
  spec.add_dependency "test-unit"
  spec.add_dependency "rdoc"
  spec.add_dependency "yard"

  # For more information and examples about making a new gem, check out our
  # guide at: https://bundler.io/guides/creating_gem.html
end
