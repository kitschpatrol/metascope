# frozen_string_literal: true

require_relative "lib/mj/version"

Gem::Specification.new do |spec|
  spec.name = "mj"
  spec.version = Mj::VERSION
  spec.authors = ["Marcelo Jacobus"]
  spec.email = ["marcelo.jacobus@gmail.com"]

  spec.summary = "My personal CLI"
  spec.description = "A collection of useful commands for my personal use"
  spec.homepage = "https://github.com/mjacobus/mj"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 2.7.0"

  spec.metadata["allowed_push_host"] = "https://rubygems.org"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["changelog_uri"] = "#{spec.homepage}/blob/main/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    `git ls-files -z`.split("\x0").reject do |f|
      (f == __FILE__) || f.match(%r{\A(?:(?:bin|test|spec|features)/|\.(?:git|travis|circleci)|appveyor)})
    end
  end
  spec.bindir = "exe"
  spec.executables = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "colorize"
  spec.add_dependency "koine-rest_client"
  spec.add_dependency "mj-hash_utils"
  spec.add_dependency "ruby-openai", "~> 6.2.0"
  spec.add_dependency "thor", "~> 1.2.1"
  spec.add_dependency "uri", "~> 0.13.0"

  # For more information and examples about making a new gem, check out our
  # guide at: https://bundler.io/guides/creating_gem.html
  spec.metadata["rubygems_mfa_required"] = "true"
end
