# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "re"
  spec.version       = "0.4.0"
  spec.authors       = ["Klaudio Sinai"]
  spec.email         = ["klaudiosinani@protonmail.ch"]

  spec.summary       = "Minimalistic Jekyll theme for GitHub Pages"
  spec.homepage      = "https://github.com/klaudiosinani/re"
  spec.license       = "MIT"
  
  spec.metadata = {
    "plugin_type"       => "theme",
    "github_repo"       => "#{spec.homepage}",
    "homepage_uri"      => "#{spec.homepage}",
    "source_code_uri"   => "#{spec.homepage}",
    "documentation_uri" => "#{spec.homepage}/blob/main/readme.md",
    "bug_tracker_uri"   => "#{spec.homepage}/issues"
  }

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README|_config\.yml)!i) }

  spec.add_runtime_dependency "jekyll", "~> 4.4"
  spec.add_runtime_dependency "jekyll-github-metadata", "~> 2.16.1"
  spec.add_runtime_dependency "jekyll-sitemap", "~> 1.4"
  spec.add_runtime_dependency "jekyll-remote-theme", "~> 0.4.3"
  spec.add_runtime_dependency "faraday-retry", "~> 2.0"

  spec.add_development_dependency "bundler", "~> 2.3"
  spec.add_development_dependency "rake", "~> 13.0"
end