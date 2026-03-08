# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "personal-webpage"
  spec.version       = "0"
  spec.authors       = ["Hayden LeBaron"]
  spec.email         = ["me@haydenlebaron.com"]

  spec.summary       = "My Personal Page"
  spec.homepage      = "https://github.com/HaydenTheBaron/HaydenTheBaron.github.io"
  spec.license       = "MIT"

  spec.files = `git ls-files -z`.split("\x0").select do |f|
    f.match(%r!^(assets|_(includes|layouts|sass)/|(LICENSE|README)((\.(txt|md|markdown)|$)))!i)
  end

  spec.add_runtime_dependency "jekyll", ">= 3.5", "< 5.0"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.1"

  spec.add_development_dependency "bundler"
end
