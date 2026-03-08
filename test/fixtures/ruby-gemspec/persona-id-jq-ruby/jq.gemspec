# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name = "jq"
  spec.version = "1.0.0"
  spec.authors = ["Persona Identities"]
  spec.email = ["rubygems@withpersona.com"]

  spec.summary = "Ruby bindings for jq, the JSON processor"
  spec.description = "A minimal, security-focused Ruby gem that wraps the jq C library for JSON transformation"
  spec.homepage = "https://github.com/persona-id/jq-ruby"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.3.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["changelog_uri"] = "#{spec.homepage}/blob/main/CHANGELOG.md"
  spec.metadata["bug_tracker_uri"] = "#{spec.homepage}/issues"
  spec.metadata["documentation_uri"] = "https://rubydoc.info/gems/jq"

  # Specify which files should be added to the gem when it is released.
  spec.files = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir = "exe"
  spec.executables = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]
  spec.extensions = ["ext/jq/extconf.rb"]

  spec.add_dependency "mini_portile2", "~> 2.8"

  spec.add_development_dependency "rake", "~> 13.0"
  spec.add_development_dependency "rake-compiler", "~> 1.2"
  spec.add_development_dependency "rspec", "~> 3.13"
end
